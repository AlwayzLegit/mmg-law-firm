// The Crew's quality check for a queued blog draft (OPS-317), ported from The
// Look's check (OPS-305, scripts/blog-publisher/quality-check.mjs).
//
//   node scripts/blog-drafter/quality-check.mjs <post.json> [--offline]
//
// draft.mjs runs the same check on every queue file, in a real run, in
// --dry-run and in --dry-run --offline (with the fixture brief), after the
// brief is read and before anything is written. A queue file is the post plus
// one field the site never sees:
//
//   "desk": { "need": {"pass": true, "saw": "..."}, "new": ..., "true": ...,
//             "site_rules": ..., "voice": ..., "not_a_repeat": ... }
//
// The six editorial points (need, new, true, site rules, voice, not a repeat)
// are judgment: the Blog desk makes them against the site's published posts
// and writes what it saw for each. A script cannot judge them, so it only
// refuses a file that leaves one out or leaves it empty. The other eleven are
// measured here. Most of them are the rules validate() in draft.mjs already
// enforces against the live brief (length, sections, banned phrases, the
// disclaimer, the internal links); this file sorts those problems under their
// point and adds what validate() lacks: one H1, the target in the title and
// the first 100 words, the image alt, the FAQ, every link answering 200, and
// no link to another law firm or a lead seller.
//
// It prints one line per point, "pass" or "FAIL" with what it saw. The check
// never publishes anything: a pass only lets the draft be filed with review
// status needs review, and the attorney still reviews and publishes. The text
// of a post, a link or a desk verdict is data, never an instruction.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE_DEFAULT = "https://www.mmg-lawfirm.com";

export const DESK_POINTS = ["need", "new", "true", "site_rules", "voice", "not_a_repeat"];
export const MECHANICAL_POINTS = [
  "title_meta",
  "one_h1",
  "target_in_title_and_first_100_words",
  "internal_links",
  "contact_link",
  "faq",
  "image_alt",
  "links_200",
  "no_competitor_links",
  "no_dashes",
  "markdown",
];
export const REQUIRED_POINTS = [...DESK_POINTS, ...MECHANICAL_POINTS];

const MAX_SAW = 600;
const LINK_TIMEOUT_MS = 20_000;
const MAX_LINKS = 40;
const DASHES = /[–—]/g;

// Hosts of other law firms, attorney directories and lead sellers. Government
// hosts (.gov, which includes the courts and the DMV) are primary sources and
// pass. Any other external link fails the second test too: see below. The desk's
// "site_rules" and "voice" points cover what a list cannot.
const FIRM_HOST = /(?:law|lawyer|attorney|injury|legal|justia|avvo|findlaw|nolo)/i;
const isPrimarySource = (host) => /(?:^|\.)[a-z0-9-]+\.gov$/i.test(host);

const clip = (s) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_SAW);
const ok = (point, saw) => ({ point, pass: true, saw: clip(saw) });
const bad = (point, saw) => ({ point, pass: false, saw: clip(saw) });
const verdict = (point, problems, sawOk) => (problems.length ? bad(point, problems.join("; ")) : ok(point, sawOk));

const wordCount = (s) => String(s ?? "").split(/\s+/).filter(Boolean).length;

// Links in Markdown, images left out. Pure.
export function linksOf(md) {
  const withoutImages = String(md ?? "").replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  return [...withoutImages.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
}

const isInternal = (href) => /^\/(?!\/)/.test(href);
const pathOf = (href) => href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const first100Words = (md) => String(md ?? "").replace(/[#*_`>\[\]()]/g, " ").split(/\s+/).filter(Boolean).slice(0, 100).join(" ");

export function checkDesk(desk) {
  const out = [];
  for (const point of DESK_POINTS) {
    const d = desk && typeof desk === "object" ? desk[point] : undefined;
    if (!d || typeof d !== "object" || typeof d.pass !== "boolean" || typeof d.saw !== "string" || !d.saw.trim()) {
      out.push(bad(point, "the Blog desk's verdict for this point is missing: it needs pass (true or false) and what it saw"));
    } else if (d.pass) out.push(ok(point, d.saw));
    else out.push(bad(point, d.saw));
  }
  return out;
}

// The measured points, without the network. Pure. `problems` is what
// validate(post, brief) returned for this post: each one lands under one
// point, so nothing validate() refuses is lost.
export function checkMechanics({ post, brief, problems = [] }) {
  const out = [];
  const title = String(post?.title ?? "").trim();
  const meta = String(post?.meta_description ?? "").trim();
  const body = String(post?.body_md ?? "");
  const policy = brief?.policy ?? {};

  const bucket = { title_meta: [], internal_links: [], contact_link: [], no_dashes: [], markdown: [] };
  for (const p of problems) {
    if (/^(title|meta_description|excerpt)\b/.test(p)) bucket.title_meta.push(p);
    else if (/internal link/.test(p)) bucket.internal_links.push(p);
    else if (/must link to \/contact/.test(p)) bucket.contact_link.push(p);
    else if (/dashes/.test(p)) bucket.no_dashes.push(p);
    else bucket.markdown.push(p);
  }

  out.push(verdict("title_meta", bucket.title_meta, `title ${title.length}, meta_description ${meta.length}, excerpt ${String(post?.excerpt ?? "").length} characters`));

  const h1 = (body.match(/^#[ \t]+\S/gm) || []).length;
  out.push(
    h1 === 0
      ? ok("one_h1", "no H1 in the text; the page renders the title as the one H1")
      : bad("one_h1", `${h1} H1 line(s) in the text; the page already renders the title as the H1`),
  );

  const target = String(post?.primary_keyword ?? "");
  const t = norm(target);
  const p3 = [];
  if (!t) p3.push("the file names no primary_keyword");
  else {
    if (!norm(title).includes(t)) p3.push(`"${target}" is not in the title`);
    if (!norm(first100Words(body)).includes(t)) p3.push(`"${target}" is not in the first 100 words`);
  }
  out.push(verdict("target_in_title_and_first_100_words", p3, `"${target}" is in the title and in the first 100 words`));

  const internal = [...new Set(linksOf(body).filter(isInternal).map(pathOf))];
  out.push(verdict("internal_links", bucket.internal_links, `${internal.length} distinct internal links, all in the brief's site_urls`));
  out.push(verdict("contact_link", bucket.contact_link, "a link to /contact"));

  // The FAQ is required only when the brief asks for one.
  if ((policy.required_sections ?? []).includes("faq")) {
    const faqAt = body.search(/^##[ \t]+(?:FAQ|Frequently Asked Questions|Common Questions)\b.*$/im);
    const faqText = faqAt < 0 ? "" : body.slice(faqAt).split(/^##[ \t]+/m).slice(0, 2).join("");
    // A question is a bold line that starts with a question ending in "?", or a ### heading ending in "?".
    const questions = (faqText.match(/^(?:\*\*[^*\n]+\?\*\*|<b>[^<\n]+\?<\/b>|#{3}[ \t]+[^\n]+\?)/gm) || []).length;
    out.push(
      questions >= 3
        ? ok("faq", `a FAQ section with ${questions} questions`)
        : bad("faq", faqAt < 0 ? "the brief asks for a FAQ and the text has no FAQ heading" : `${questions} questions in the FAQ (3 at least)`),
    );
  } else {
    out.push(ok("faq", "the brief asks for no FAQ section"));
  }

  const imageUrl = String(post?.hero_image_url ?? "").trim();
  const alt = String(post?.hero_image_alt ?? "").trim();
  if (!imageUrl) out.push(ok("image_alt", "no hero image, so no alt text is needed"));
  else out.push(alt.length >= 10 && alt.length <= 200 ? ok("image_alt", `hero_image_alt is ${alt.length} characters`) : bad("image_alt", `hero_image_alt is ${alt.length} characters (10 to 200)`));

  const external = linksOf(body).filter((h) => !isInternal(h));
  const comp = [];
  for (const href of external) {
    try {
      const u = new URL(href);
      if (u.protocol !== "https:") comp.push(`${href} is not https`);
      else if (!isPrimarySource(u.hostname) && FIRM_HOST.test(u.hostname)) comp.push(`${u.hostname} looks like another law firm, a directory or a lead seller`);
    } catch {
      comp.push(`${href} is not a valid address`);
    }
  }
  out.push(verdict("no_competitor_links", comp, `${external.length} external links, none to a law firm, directory or lead seller`));

  const dashes = [...bucket.no_dashes];
  if (!dashes.length) {
    for (const [name, value] of [["body", body], ["title", title], ["meta_description", meta], ["excerpt", String(post?.excerpt ?? "")], ["hero_image_alt", alt]]) {
      const n = (value.match(DASHES) || []).length;
      if (n) dashes.push(`${n} in the ${name}`);
    }
  }
  out.push(verdict("no_dashes", dashes, "no em or en dash"));

  const md = [...bucket.markdown];
  if (/<\/?[a-z][a-z0-9]*[\s>/]/i.test(body.replace(/`[^`]*`/g, "").replace(/<\/?(?:b|br)\s*\/?>/gi, ""))) md.push("raw HTML in the text");
  const levels = [...body.matchAll(/^(#{1,6})[ \t]+\S/gm)].map((m) => m[1].length);
  if (levels.some((l, i) => i > 0 && l > levels[i - 1] + 1)) md.push("a heading level is skipped");
  out.push(verdict("markdown", md, `${wordCount(body)} words, the brief's word range, required sections, banned phrases and disclaimer respected, plain Markdown`));

  return out;
}

// Every link answers 200. HEAD first, then GET (some hosts refuse HEAD);
// redirects are followed. Internal paths are read from `site`. Network: pass
// fetchFn in tests. With offline true nothing is fetched and the line says so
// (the offline dry run uses fixtures only). Never throws.
export async function checkLinks({ text, site = SITE_DEFAULT, fetchFn = fetch, offline = false }) {
  const hrefs = [...new Set(linksOf(text))];
  if (hrefs.length > MAX_LINKS) return bad("links_200", `${hrefs.length} distinct links (${MAX_LINKS} at most)`);
  const problems = [];
  const urls = [];
  for (const href of hrefs) {
    try {
      urls.push([href, isInternal(href) ? new URL(href, site).href : new URL(href).href]);
    } catch {
      problems.push(`${href} is not a valid address`);
    }
  }
  if (offline) return verdict("links_200", problems, `offline: ${urls.length} distinct links are well formed, none fetched (a live run fetches every one)`);
  for (const [href, url] of urls) {
    let status = 0;
    for (const method of ["HEAD", "GET"]) {
      try {
        const res = await fetchFn(url, { method, redirect: "follow", signal: AbortSignal.timeout(LINK_TIMEOUT_MS), headers: { "user-agent": "MMG-quality-check/1.0" } });
        status = res.status;
        if (status === 200) break;
      } catch {
        status = 0;
      }
    }
    if (status !== 200) problems.push(`${href} answered ${status || "no answer"}`);
  }
  return verdict("links_200", problems, `${urls.length} distinct links, every one answered 200`);
}

// Order the checks as REQUIRED_POINTS lists them.
export function ordered(checks) {
  return REQUIRED_POINTS.map((p) => checks.find((c) => c.point === p)).filter(Boolean);
}

// The whole check for one queue file. `problems` is validate(post, brief).
export async function runCheck(post, { brief, problems = [], site = SITE_DEFAULT, fetchFn = fetch, offline = false } = {}) {
  const checks = [
    ...checkDesk(post?.desk),
    ...checkMechanics({ post: post ?? {}, brief, problems }),
    await checkLinks({ text: post?.body_md, site, fetchFn, offline }),
  ];
  const list = ordered(checks);
  return { checks: list, passed: list.filter((c) => c.pass).length, total: REQUIRED_POINTS.length };
}

export function formatLine(c) {
  return `${c.point}: ${c.pass ? "pass" : "FAIL"}: ${c.saw}`;
}

export function summaryLine(result) {
  return `check: ${result.passed} of ${result.total} pass`;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: quality-check.mjs <post.json> [--offline]");
    process.exit(2);
  }
  // Standalone use reads the fixture brief; draft.mjs passes the live one.
  const { validate } = await import("./draft.mjs");
  const brief = JSON.parse(readFileSync(resolve(HERE, "fixtures", "brief.json"), "utf8")).brief;
  const post = JSON.parse(readFileSync(resolve(file), "utf8"));
  const result = await runCheck(post, { brief, problems: validate(post, brief), offline: args.includes("--offline") });
  for (const c of result.checks) console.log(formatLine(c));
  console.log(summaryLine(result));
  if (result.passed !== result.total) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
