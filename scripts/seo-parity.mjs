#!/usr/bin/env node
/**
 * SEO-parity checker for the redesign.
 *
 *   node scripts/seo-parity.mjs capture <outDir> [--base http://localhost:3000]
 *   node scripts/seo-parity.mjs compare <baselineDir> <candidateDir>
 *
 * `capture` fetches a fixed list of public URLs from a running server and
 * stores, per page: ordered h1–h3 headings, the set of visible text tokens,
 * internal link hrefs, JSON-LD blocks, <title> and meta description.
 * `compare` reports anything REMOVED in the candidate (headings, links,
 * JSON-LD types, text) — additions are fine, removals fail the check.
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const PAGES = [
  "/",
  "/practice-areas",
  "/practice-areas/car-accidents",
  "/practice-areas/employment-law",
  "/attorneys/mihran-ghazaryan",
  "/contact",
  "/locations",
  "/locations/los-angeles-county",
  "/locations/los-angeles-county/glendale",
  "/blog",
  "/legal/privacy",
];

const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter((x, i, arr) => !x.startsWith("--") && arr[i - 1] !== "--base");
const [a, b] = positional;
if (cmd === "capture") await capture(a, flag(argv, "--base") ?? "http://localhost:3000");
else if (cmd === "compare") await compare(a, b);
else {
  console.error("usage: capture <outDir> [--base URL] | compare <baseline> <candidate>");
  process.exit(2);
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
function strip(html) {
  return decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extract(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, (m) => (/application\/ld\+json/.test(m) ? m : ""))
    .replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  const headings = [...body.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => `${m[1]}: ${strip(m[2])}`);
  const links = [...new Set([...body.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)].map((m) => m[1]).filter((h) => h.startsWith("/") || h.startsWith("tel:") || h.startsWith("mailto:")).map((h) => h.split("#")[0]))].sort();
  const ld = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return null; }
  }).filter(Boolean);
  const ldTypes = [...new Set(ld.flatMap(walkTypes))].sort();
  const title = strip(body.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const meta = decode(body.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? "");
  const canonical = body.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i)?.[1] ?? "";
  const main = body.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? body;
  const text = strip(main.replace(/<script[\s\S]*?<\/script>/gi, ""));
  // Sentence-ish tokens: split on terminal punctuation; keep ≥ 25 chars so we compare real copy, not labels.
  const sentences = [...new Set(text.split(/(?<=[.!?])\s+|\s{2,}/).map((s) => s.trim()).filter((s) => s.length >= 25))].sort();
  return { title, meta, canonical, headings, links, ldTypes, sentences, ldCount: ld.length };
}
function walkTypes(node) {
  if (!node || typeof node !== "object") return [];
  const out = [];
  if (typeof node["@type"] === "string") out.push(node["@type"]);
  for (const v of Object.values(node)) if (typeof v === "object") out.push(...walkTypes(v));
  return out;
}
function fileFor(p) {
  return (p === "/" ? "home" : p.replace(/^\//, "").replace(/\//g, "__")) + ".json";
}

async function capture(outDir, base) {
  if (!outDir) throw new Error("outDir required");
  await mkdir(outDir, { recursive: true });
  for (const p of PAGES) {
    const res = await fetch(base + p);
    if (!res.ok) { console.warn(`! ${p} → ${res.status}`); continue; }
    const html = await res.text();
    const data = extract(html);
    await writeFile(path.join(outDir, fileFor(p)), JSON.stringify({ path: p, ...data }, null, 2));
    console.log(`✓ ${p}  h:${data.headings.length} links:${data.links.length} ld:${data.ldCount} sentences:${data.sentences.length}`);
  }
}

async function compare(baseDir, candDir) {
  let failures = 0;
  const files = (await readdir(baseDir)).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const A = JSON.parse(await readFile(path.join(baseDir, f), "utf8"));
    let B;
    try { B = JSON.parse(await readFile(path.join(candDir, f), "utf8")); } catch { console.log(`✗ ${A.path}: missing in candidate`); failures++; continue; }
    const problems = [];
    if (A.title !== B.title) problems.push(`title changed: "${A.title}" → "${B.title}"`);
    if (A.meta !== B.meta) problems.push(`meta changed`);
    if (A.canonical !== B.canonical) problems.push(`canonical changed: ${A.canonical} → ${B.canonical}`);
    const h1A = A.headings.filter((h) => h.startsWith("h1")); const h1B = B.headings.filter((h) => h.startsWith("h1"));
    if (JSON.stringify(h1A) !== JSON.stringify(h1B)) problems.push(`h1 changed: ${JSON.stringify(h1A)} → ${JSON.stringify(h1B)}`);
    const missingH = A.headings.filter((h) => !B.headings.includes(h));
    if (missingH.length) problems.push(`headings removed: ${missingH.join(" | ")}`);
    const missingL = A.links.filter((l) => !B.links.includes(l));
    if (missingL.length) problems.push(`links removed: ${missingL.join(", ")}`);
    const missingLd = A.ldTypes.filter((t) => !B.ldTypes.includes(t));
    if (missingLd.length) problems.push(`JSON-LD types removed: ${missingLd.join(", ")}`);
    const bText = B.sentences.join(" \n ");
    const missingS = A.sentences.filter((s) => !bText.includes(s));
    if (missingS.length) problems.push(`copy removed (${missingS.length}):\n      - ${missingS.slice(0, 12).join("\n      - ")}${missingS.length > 12 ? "\n      …" : ""}`);
    if (problems.length) { failures++; console.log(`✗ ${A.path}\n    ${problems.join("\n    ")}`); }
    else console.log(`✓ ${A.path}`);
  }
  if (failures) { console.log(`\n${failures} page(s) lost indexed content.`); process.exit(1); }
  console.log("\nParity OK — nothing removed.");
}
