#!/usr/bin/env node
/**
 * Compare the SEO-relevant <head> of two origins page by page: title, meta
 * description, canonical (with each origin normalised away), robots meta,
 * and the number of JSON-LD blocks. Also reports status codes and the
 * X-Robots-Tag header. Exit code 1 on any difference.
 *
 *   pnpm parity                                   # production vs staging
 *   pnpm parity https://www.mmg-lawfirm.com https://mmg-law-firm.jetnine-inc.workers.dev
 *
 * Used for the Cloudflare go/no-go (docs/cloudflare-migration-plan.md §C)
 * and again right after the DNS cutover (§D step 3).
 */
const [, , a = "https://www.mmg-lawfirm.com", b = "https://staging.mmg-lawfirm.com"] = process.argv;

const PATHS = [
  "/",
  "/contact",
  "/practice-areas/car-accidents",
  "/practice-areas/truck-accidents",
  "/practice-areas/motorcycle-accidents",
  "/rear-end-car-accident-lawyer",
  "/locations",
  "/locations/los-angeles-county",
  "/locations/los-angeles-county/glendale",
  "/locations/los-angeles-county/glendale/car-accidents",
  "/blog",
  "/attorneys/mihran-ghazaryan",
  "/case-results",
  "/reviews",
  "/legal/privacy",
  "/hy",
  "/ru/contact",
];

/**
 * Canonicals are compared with both origins normalised away, so a Worker
 * whose canonical correctly points at the production origin (the
 * production Worker on workers.dev) still compares equal.
 */
function normaliseOrigin(url) {
  return [a, b].reduce((u, o) => u.replace(o, "ORIGIN"), url);
}

function head(html) {
  const pick = (re) => (html.match(re)?.[1] ?? "").trim();
  return {
    title: pick(/<title>([^<]*)<\/title>/i),
    description: pick(/<meta name="description" content="([^"]*)"/i),
    canonical: normaliseOrigin(pick(/<link rel="canonical" href="([^"]*)"/i)),
    robots: pick(/<meta name="robots" content="([^"]*)"/i),
    jsonLd: (html.match(/<script type="application\/ld\+json"/gi) ?? []).length,
  };
}

async function get(origin, path) {
  const res = await fetch(origin + path, { redirect: "manual", headers: { "user-agent": "mmg-parity-check" } });
  const html = res.status === 200 ? await res.text() : "";
  return { status: res.status, xRobots: res.headers.get("x-robots-tag") ?? "", head: head(html) };
}

let diffs = 0;
console.log(`A ${a}\nB ${b}\n`);
for (const path of PATHS) {
  const [x, y] = await Promise.all([get(a, path), get(b, path)]);
  const fields = Object.keys(x.head).filter((k) => x.head[k] !== y.head[k]);
  if (x.status !== y.status) fields.unshift("status");
  if (fields.length === 0) {
    console.log(`SAME  ${path}  (${x.status})`);
    continue;
  }
  diffs += 1;
  console.log(`DIFF  ${path}`);
  for (const f of fields) {
    const va = f === "status" ? x.status : x.head[f];
    const vb = f === "status" ? y.status : y.head[f];
    console.log(`      ${f}: A=${JSON.stringify(va)}  B=${JSON.stringify(vb)}`);
  }
}
const [ra, rb] = await Promise.all([get(a, "/"), get(b, "/")]);
console.log(`\nX-Robots-Tag  A=${JSON.stringify(ra.xRobots)}  B=${JSON.stringify(rb.xRobots)}`);
console.log(diffs ? `\n${diffs} page(s) differ` : `\nall ${PATHS.length} pages match`);
process.exit(diffs ? 1 : 0);
