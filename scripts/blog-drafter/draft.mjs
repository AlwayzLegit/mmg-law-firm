#!/usr/bin/env node
// Files one queued blog post on mmg-lawfirm.com as a DRAFT for attorney review.
//
//   node scripts/blog-drafter/draft.mjs <post.json> --dry-run --offline   fixtures only, no key, no network
//   node scripts/blog-drafter/draft.mjs <post.json> --dry-run             live brief and post list, read-only
//   node scripts/blog-drafter/draft.mjs <post.json>                       real run: start run, create draft, report
//
// The key comes from MMG_API_KEY and is never printed. This script never
// publishes: it does not send is_published, published_at, review_status or
// author_name, and it refuses a queue file that contains them. The cap (CAP
// drafts or posts filed in WINDOW_DAYS days) is a constant that no flag, env
// var or queue field can change. Only numbers and section names from the
// brief are printed, never the instructions text.
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CAP = 3;
export const WINDOW_DAYS = 7;
export const SITE = "https://www.mmg-lawfirm.com";
const DAY_MS = 24 * 60 * 60 * 1000;
const HERE = dirname(fileURLToPath(import.meta.url));
const DASHES = /[–—]/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ALLOWED_FIELDS = [
  "title", "slug", "body_md", "excerpt", "meta_description", "tags", "primary_keyword",
  "secondary_keywords", "practice_area_ids", "related_county_ids", "hero_image_url", "hero_image_alt", "topic_id",
];
export const FORBIDDEN_FIELDS = ["is_published", "published_at", "review_status", "author_name", "allow_duplicate", "run_id"];

/** Every post counts, whatever its status or source, by created_at. */
export function capCheck(posts, now = new Date()) {
  const since = now.getTime() - WINDOW_DAYS * DAY_MS;
  const dates = posts
    .map((p) => (p.created_at ? new Date(p.created_at).getTime() : NaN))
    .filter((t) => Number.isFinite(t) && t > since)
    .sort((a, b) => a - b);
  const count = dates.length;
  const allowed = count < CAP;
  const nextSlotAt = allowed ? null : new Date(dates[count - CAP] + WINDOW_DAYS * DAY_MS);
  return { count, limit: CAP, allowed, nextSlotAt };
}

export function capLine(r) {
  const tail = r.allowed ? "" : `, next slot opens ${r.nextSlotAt.toISOString()}`;
  return `cap: ${r.count} of ${CAP} filed in the last ${WINDOW_DAYS} days${tail}`;
}

const words = (s) => (s ?? "").split(/\s+/).filter(Boolean).length;
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Internal (site-relative) link targets in a markdown body, without query or hash, deduplicated. */
export function internalLinks(md) {
  const out = new Set();
  for (const m of (md ?? "").matchAll(/\]\((\/[^)\s]*)\)/g)) {
    const path = m[1].split(/[?#]/)[0];
    out.add(path.length > 1 ? path.replace(/\/$/, "") : path);
  }
  return [...out];
}

/** Every URL the brief lists as linkable. */
export function allowedUrls(siteUrls = {}) {
  const urls = new Set();
  for (const k of ["practice_areas", "counties", "locations", "legal"]) {
    for (const row of siteUrls[k] ?? []) if (row?.url) urls.add(row.url.replace(/\/$/, "") || "/");
  }
  for (const u of siteUrls.static ?? []) urls.add(u.replace(/\/$/, "") || "/");
  return urls;
}

/** Pure checks against the brief. Returns a list of problems. */
export function validate(post, brief) {
  const problems = [];
  const policy = brief?.policy ?? {};
  const body = post.body_md ?? "";
  for (const f of FORBIDDEN_FIELDS) if (f in post) problems.push(`field not allowed in a queue file: ${f}`);
  if (!SLUG_RE.test(post.slug ?? "")) problems.push("slug must be kebab-case");
  if (!post.title || post.title.length > 60) problems.push("title is required, 60 characters at most");
  const mdLen = (post.meta_description ?? "").length;
  if (mdLen < 120 || mdLen > 155) problems.push(`meta_description is ${mdLen} characters, must be 120 to 155`);
  if (!post.excerpt || post.excerpt.length > 300) problems.push("excerpt is required, 300 characters at most");
  if (!Array.isArray(post.tags) || post.tags.length < 3 || post.tags.length > 6) problems.push("tags: 3 to 6 required");
  if (!post.primary_keyword) problems.push("primary_keyword is required");

  const n = words(body);
  if (policy.min_words && n < policy.min_words) problems.push(`body_md is ${n} words, minimum ${policy.min_words}`);
  if (policy.max_words && n > policy.max_words) problems.push(`body_md is ${n} words, maximum ${policy.max_words}`);

  const h2 = [...body.matchAll(/^## (.+)$/gm)].map((m) => norm(m[1]));
  for (const s of policy.required_sections ?? []) {
    if (!h2.some((h) => h.includes(norm(s)))) problems.push(`missing required H2 section: ${s}`);
  }
  const all = norm([post.title, post.excerpt, post.meta_description, body, ...(post.tags ?? [])].join(" "));
  for (const phrase of policy.banned_phrases ?? []) {
    if (phrase && all.includes(norm(phrase))) problems.push(`banned phrase present: ${phrase}`);
  }
  const general = brief?.site?.disclaimers?.general;
  if (general && !body.includes(general)) problems.push("the general disclaimer is missing or not word for word");

  const links = internalLinks(body);
  const lim = policy.internal_links ?? { min: 3, max: 8 };
  if (!links.includes("/contact")) problems.push("body_md must link to /contact");
  if (links.length < (lim.min ?? 3) || links.length > (lim.max ?? 8)) {
    problems.push(`${links.length} internal links, must be ${lim.min ?? 3} to ${lim.max ?? 8}`);
  }
  const ok = allowedUrls(brief?.site_urls);
  if (ok.size) for (const l of links) if (!ok.has(l)) problems.push(`internal link not in site_urls: ${l}`);

  const text = [post.title, post.excerpt, post.meta_description, post.hero_image_alt, body, ...(post.tags ?? [])];
  if (text.some((s) => typeof s === "string" && DASHES.test(s))) problems.push("no em or en dashes in any text field");
  return problems;
}

/** Allow-list copy: nothing else reaches the API. */
export function buildPayload(post, runId) {
  const payload = {};
  for (const k of ALLOWED_FIELDS) if (post[k] !== undefined) payload[k] = post[k];
  payload.run_id = runId;
  return payload;
}

function fail(msg, code = 1) {
  console.error(`draft: ${msg}`);
  process.exit(code);
}
function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

async function api(key, method, path, { body, idem } = {}) {
  const headers = { authorization: `Bearer ${key}`, "content-type": "application/json" };
  if (idem) headers["idempotency-key"] = idem;
  const res = await fetch(`${SITE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function listAllPosts(key) {
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const r = await api(key, "GET", `/api/admin/blog?status=all&limit=100&offset=${offset}`);
    if (r.status !== 200) throw new Error(`post list answered ${r.status}`);
    const rows = r.json.posts ?? [];
    all.push(...rows);
    if (rows.length < 100) break;
  }
  return all;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) fail("usage: draft.mjs <post.json> [--dry-run [--offline]]");
  const post = readJson(resolve(file));
  const dry = args.includes("--dry-run");
  const offline = dry && args.includes("--offline");
  const key = process.env.MMG_API_KEY || "";

  let brief;
  let posts;
  if (offline) {
    brief = readJson(resolve(HERE, "fixtures", "brief.json")).brief;
    posts = readJson(resolve(HERE, "fixtures", "posts.json")).posts;
    console.log("brief: fixture");
  } else {
    if (!key) fail("MMG_API_KEY is not set");
    const b = await api(key, "GET", "/api/admin/agent/brief?include=site_urls,history");
    if (b.status !== 200) fail(`brief answered ${b.status}`);
    brief = b.json.brief;
    posts = await listAllPosts(key);
    console.log(`brief: live, instructions v${brief.instructions?.version ?? "none"}`);
  }

  const cap = capCheck(posts);
  console.log(capLine(cap));
  summary(`**${capLine(cap)}**`);
  const problems = validate(post, brief);
  const paused = brief.policy?.pause_drafting === true;

  if (dry) {
    if (paused) console.log(`note: drafting is paused on the site (${brief.policy.pause_reason ? "backlog over its limit" : "policy"})`);
    if (problems.length) {
      summary(`Dry run problems:\n${problems.map((p) => `- ${p}`).join("\n")}`);
      fail(`dry run found problems:\n  - ${problems.join("\n  - ")}`);
    }
    console.log(`dry run OK: ${post.slug}, draft payload valid, nothing created`);
    summary(`Dry run OK: ${post.slug}, nothing created`);
    return;
  }

  // Real run. Nothing is started on the site until these pass.
  if (paused) fail(`paused: ${brief.policy.pause_reason ?? "drafting is paused by policy"}`);
  if (!cap.allowed) fail(`not filed: cap reached, ${cap.count} drafts or posts in the last ${WINDOW_DAYS} days (limit ${CAP}), next slot opens ${cap.nextSlotAt.toISOString()}`);
  if (String(post.slug).startsWith("sample-")) fail("not filed: sample slugs are never filed");
  if (problems.length) {
    summary(`Not filed:\n${problems.map((p) => `- ${p}`).join("\n")}`);
    fail(`not filed:\n  - ${problems.join("\n  - ")}`);
  }

  const started = Date.now();
  const branch = process.env.GITHUB_REF_NAME || `local-${post.slug}`;
  const runBody = { agent_name: "crew-blog-desk", claim_topics: post.topic_id ? undefined : 0, include_brief: false, meta: { trigger: "queue-branch" } };
  if (post.topic_id) runBody.topic_ids = [post.topic_id];
  const run = await api(key, "POST", "/api/admin/agent/runs", { body: runBody, idem: `crew-${branch}`.slice(0, 128) });
  if (run.status !== 201 && run.status !== 200) fail(`could not start a run (${run.status})`);
  const runId = run.json.run?.id;
  if (!runId) fail("run started but no id came back");

  const finish = (body) => api(key, "PATCH", `/api/admin/agent/runs/${runId}`, { body });
  const failRun = async (msg) => {
    await finish({ status: "failed", error: msg.slice(0, 3900) });
    fail(msg);
  };

  const created = await api(key, "POST", "/api/admin/blog", { body: buildPayload(post, runId), idem: `${runId}:${post.slug}` });
  if (created.status === 409 && created.json.error === "duplicate_topic") {
    const by = created.json.existing?.public_url ?? "an existing post";
    const body = { status: "succeeded", summary_md: `Skipped, already covered by ${by}.`, report: { posts: [], skipped_topics: post.topic_id ? [post.topic_id] : [] } };
    if (post.topic_id) body.topics = [{ id: post.topic_id, status: "skipped", note: `already covered by ${by}` }];
    await finish(body);
    fail(`skipped, already covered by ${by}`);
  }
  if (created.status !== 201) return failRun(`create answered ${created.status}${created.json.error ? ` (${created.json.error})` : ""}`);
  const saved = created.json.post ?? {};
  if (created.json.review_status !== "needs_review" && saved.review_status !== "needs_review") return failRun("draft did not come back as needs_review");
  if (saved.is_published !== false) return failRun("draft came back published, which must never happen");
  const pub = await fetch(`${SITE}/blog/${post.slug}`, { redirect: "manual" });
  if (pub.status !== 404) return failRun(`public /blog/${post.slug} answered ${pub.status}, expected 404 for a draft`);

  const finished = await finish({
    status: "succeeded",
    summary_md: `Filed draft **${post.slug}** (${words(post.body_md)} words) for attorney review. Keyword: ${post.primary_keyword}.`,
    report: { posts: [{ post_id: saved.id, slug: post.slug, title: post.title, primary_keyword: post.primary_keyword, word_count: words(post.body_md), internal_links: internalLinks(post.body_md), published: false, topic_id: post.topic_id ?? null }] },
    metrics: { duration_s: Math.round((Date.now() - started) / 1000) },
    ...(post.topic_id ? { topics: [{ id: post.topic_id, status: "drafted", post_id: saved.id }] } : {}),
  });
  if (finished.status !== 200) console.warn(`draft: run report answered ${finished.status}`);
  console.log(`filed draft: ${post.slug} (needs review, not public)`);
  summary(`Filed draft: ${post.slug} (needs review, not public)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => fail(e.message));
}
