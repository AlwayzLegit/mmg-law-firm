#!/usr/bin/env node
/**
 * Clean up numbered duplicate blog posts created by the content agent.
 *
 *   node scripts/dedupe-blog-duplicates.mjs            # dry run: print the plan
 *   node scripts/dedupe-blog-duplicates.mjs --apply    # unpublish + redirect
 *
 * A "duplicate" is a post whose slug ends in -N and whose base slug exists as
 * another post. For each one, --apply:
 *   1. sets is_published=false, review_status='rejected' (content kept);
 *   2. inserts a permanent redirect /blog/<dup> → /blog/<base> in `redirects`
 *      (served by proxy.ts within 60 s);
 *   3. marks any content_topics row pointing at the duplicate as 'skipped';
 *   4. if REVALIDATE_SECRET + NEXT_PUBLIC_SITE_URL are set, asks the site to
 *      revalidate /blog, the sitemaps and each affected post path.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * environment or .env.local. The base (oldest) post is always the one kept.
 *
 * Known cosmetic issue: on Windows with Node 24 the process can print
 * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)" after the final
 * "Done"/"Dry run" line and exit non-zero. Everything above that line has
 * completed; it is a libuv teardown bug, not a failed step. Node 20/22 LTS
 * (the project target) exits cleanly.
 */
import { readFileSync, existsSync, writeSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv(resolve(process.cwd(), ".env.local"));

// Synchronous writes so nothing is left buffered at exit.
const out = (...a) => writeSync(1, a.join(" ") + "\n");
const err = (...a) => writeSync(2, a.join(" ") + "\n");

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  err("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}
// Connection: close — Node 24 on Windows can abort at exit while undici closes
// keep-alive sockets (libuv UV_HANDLE_CLOSING assertion); closing per request avoids it.
const supabase = createClient(url, key, {
  auth: { persistSession: false },
  global: { headers: { Connection: "close" } },
});

async function main() {

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, is_published, published_at, created_at")
    .order("created_at");
  if (error) {
    err(error.message);
    process.exitCode = 1;
    return;
  }

  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const plan = [];
  for (const p of posts) {
    const m = p.slug.match(/^(.*)-(\d+)$/);
    if (!m) continue;
    const base = bySlug.get(m[1]);
    if (!base || base.id === p.id) continue;
    plan.push({ dup: p, base });
  }

  out(`${posts.length} posts, ${plan.length} numbered duplicates with a base post.\n`);
  for (const { dup, base } of plan) {
    out(
      `${dup.is_published ? "PUB " : "     "}/blog/${dup.slug}  →  /blog/${base.slug}` +
        `\n      "${dup.title}"  (dup ${dup.created_at.slice(0, 10)}; base ${base.created_at.slice(0, 10)})`,
    );
  }
  if (plan.length === 0) process.exit(0);
  if (!apply) {
    out("\nDry run. Re-run with --apply to unpublish the duplicates and add the redirects.");
    process.exit(0);
  }

  const touched = [];
  for (const { dup, base } of plan) {
    const { error: e1 } = await supabase
      .from("blog_posts")
      .update({ is_published: false, review_status: "rejected" })
      .eq("id", dup.id);
    if (e1) {
      err(`✖ unpublish ${dup.slug}: ${e1.message}`);
      continue;
    }
    const { error: e2 } = await supabase
      .from("redirects")
      .upsert(
        { source_path: `/blog/${dup.slug}`, destination: `/blog/${base.slug}`, permanent: true },
        { onConflict: "source_path" },
      );
    if (e2) err(`✖ redirect ${dup.slug}: ${e2.message}`);
    await supabase
      .from("content_topics")
      .update({ status: "skipped", notes: `Duplicate of /blog/${base.slug}; unpublished ${new Date().toISOString().slice(0, 10)}.` })
      .eq("post_id", dup.id);
    touched.push(dup.slug);
    out(`✓ ${dup.slug} → ${base.slug}`);
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (site && secret && touched.length > 0) {
    const paths = ["/blog", "/sitemap.xml", ...touched.map((s) => `/blog/${s}`)];
    const res = await fetch(`${site}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": secret },
      body: JSON.stringify({ paths }),
    });
    out(`\nrevalidate: HTTP ${res.status}`);
  } else {
    out("\nSkipped revalidation (set NEXT_PUBLIC_SITE_URL + REVALIDATE_SECRET to trigger it); pages refresh on their next ISR window.");
  }
  out(`\nDone: ${touched.length} duplicate(s) unpublished and redirected.`);

}

await main();
