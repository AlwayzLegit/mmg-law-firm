#!/usr/bin/env node
// Deploy skip check (OPS-33).
//
// .github/workflows/cloudflare-deploy.yml starts a production deploy on every
// push to main, which waits for the owner's approval, unless every changed
// file is on the skip list. The list is the block between the two
// `deploy-skip` marker comments in that workflow. This script proves the list
// is safe: a file the Worker build reads must never be on it, or a real change
// would silently not deploy.
//
//   node scripts/deploy-skip/check.mjs                      run the rules
//   node scripts/deploy-skip/check.mjs --files a b c        deploy or no deploy
//   node scripts/deploy-skip/check.mjs --diff [base] [head] same, for a git range
//   --workflow <path>                                       read another workflow file
//
// Node 22, built-ins only. The pattern matcher, decide() and the three rules are
// pure functions so the tests can call them without a git checkout.
//
// How GitHub reads `on.push.paths` (docs.github.com, Workflow syntax, "paths"):
// patterns are checked in order, a later `!` pattern excludes a path matched
// earlier and a later plain pattern includes it again. `**` matches any
// character including `/`, `*` matches any character except `/`. The docs do
// NOT say whether `**` matches dot paths such as `.github/x.yml`, or whether
// `**/*.md` matches a `README.md` at the root. Two defences:
//   1. Every decision is made twice. Mode "min" is the reading that skips the
//      most (skip patterns liberal, plain patterns narrow); mode "max" is the
//      reading that deploys the most. The rules that protect shipped files use
//      "min". A claim of "no deploy" is only certain when "max" agrees.
//   2. Rule D refuses any tracked file with a dot segment under a shipped root,
//      so the unstated case cannot matter for a file the Worker ships.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";

export const WORKFLOW = ".github/workflows/cloudflare-deploy.yml";
// OPS-58: the workflow that does the work of one target. cloudflare-deploy.yml
// calls it, so its run: lines are build commands too.
export const TARGET_WORKFLOW = ".github/workflows/cloudflare-deploy-target.yml";
export const START = "# deploy-skip:start";
export const END = "# deploy-skip:end";
// GitHub docs: above this many changed files the filter may judge a push wrongly.
export const DIFF_LIMIT = 3000;

// ---------------------------------------------------------------- patterns

// Four shapes only (plus the exact file), each optionally led by `!`. A shape
// this script cannot judge exactly as GitHub does must not get in.
const DIR = "[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*";
const EXT = "[A-Za-z0-9_]+(?:\\.[A-Za-z0-9_]+)*";
const SHAPES = [
  { kind: "all", re: /^\*\*$/ },
  { kind: "dir", re: new RegExp(`^(${DIR})/\\*\\*$`) },
  { kind: "anyext", re: new RegExp(`^\\*\\*/\\*\\.(${EXT})$`) },
  { kind: "direxto", re: new RegExp(`^(${DIR})/\\*\\*/\\*\\.(${EXT})$`) },
  { kind: "exact", re: new RegExp(`^(${DIR})$`) },
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Parse one list entry such as `!scripts/**`. Throws on a shape not allowed. */
export function parsePattern(raw) {
  const negated = raw.startsWith("!");
  const body = negated ? raw.slice(1) : raw;
  for (const { kind, re } of SHAPES) {
    const m = re.exec(body);
    if (!m) continue;
    return { raw, negated, kind, a: m[1], b: m[2] };
  }
  throw new Error(`pattern shape not allowed: ${raw}`);
}

/**
 * Does the pattern match the path? `liberal` widens what the pattern matches
 * where GitHub's docs are silent: a leading double star followed by a slash
 * may match nothing, so the md pattern also matches a README.md at the root.
 * Dot paths always match.
 */
export function matches(p, path, liberal) {
  switch (p.kind) {
    case "all":
      return true;
    case "dir":
      return path.startsWith(`${p.a}/`);
    case "exact":
      return path === p.a;
    case "anyext":
      return new RegExp(liberal ? `^(?:.*/)?[^/]*\\.${esc(p.a)}$` : `^.+/[^/]*\\.${esc(p.a)}$`).test(path);
    case "direxto":
      return new RegExp(
        liberal ? `^${esc(p.a)}/(?:.*/)?[^/]*\\.${esc(p.b)}$` : `^${esc(p.a)}/.+/[^/]*\\.${esc(p.b)}$`,
      ).test(path);
    default:
      return false;
  }
}

/**
 * Last matching pattern wins. mode "min": skip patterns liberal, plain patterns
 * narrow (the reading that skips the most). mode "max": the opposite.
 * Returns "deploy" or "skip".
 */
export function decide(patterns, path, mode = "min") {
  let deploy = false;
  for (const p of patterns) {
    if (p.negated) {
      if (matches(p, path, mode === "min")) deploy = false;
    } else if (matches(p, path, mode === "max")) {
      deploy = true;
    }
  }
  return deploy ? "deploy" : "skip";
}

/** Read the list from the workflow text. Throws when it is missing or malformed. */
export function readList(text) {
  const lines = text.split("\n");
  const s = lines.findIndex((l) => l.trim().startsWith(START));
  const e = lines.findIndex((l) => l.trim() === END);
  if (s < 0 || e < 0 || e < s) throw new Error(`markers missing: need "${START}" ... "${END}"`);
  const patterns = [];
  let sawPaths = false;
  for (const line of lines.slice(s + 1, e)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t === "paths:") {
      sawPaths = true;
      continue;
    }
    const m = /^-\s+"([^"]+)"\s*(?:#.*)?$/.exec(t);
    if (!m) throw new Error(`cannot read this line of the list: ${t}`);
    patterns.push(parsePattern(m[1]));
  }
  if (!sawPaths) throw new Error('the block must start with "paths:" (a skip list needs `paths`, not `paths-ignore`)');
  if (!patterns.length) throw new Error("the list is empty");
  if (patterns[0].negated) throw new Error("the first pattern must be a plain one");
  return patterns;
}

// ------------------------------------------------------------------ roots

// Rule A. Everything the Worker build reads must decide "deploy". Each root
// carries the reason it is there.
export const SHIPPED_DIRS = [
  { dir: "src/", why: "the app: pages, routes, components, libraries (tests under it are excepted)" },
  { dir: "public/", why: "static files served as they are, including .md and dot-less assets" },
  { dir: "cloudflare/", why: "the Worker entry points (worker.ts, front.ts)" },
];
export const ROOT_INPUTS = [
  ["package.json", "dependencies and the cf:build script"],
  ["pnpm-lock.yaml", "pinned dependency versions"],
  ["next.config.ts", "Next build config (pageExtensions includes md and mdx)"],
  ["open-next.config.ts", "OpenNext config and the build command"],
  ["wrangler.jsonc", "app Worker bindings and routes"],
  ["wrangler.front.jsonc", "front Worker bindings and routes"],
  ["tsconfig.json", "path aliases the build resolves"],
  ["postcss.config.mjs", "Tailwind through PostCSS"],
  ["instrumentation.ts", "Next instrumentation hook"],
  ["instrumentation-client.ts", "client instrumentation"],
  ["sentry.server.config.ts", "Sentry server init"],
  ["sentry.edge.config.ts", "Sentry edge init"],
  [WORKFLOW, "the deploy itself: its secrets list, --var values and build env reach the Worker only when it runs"],
  [TARGET_WORKFLOW, "the deploy of one target: the steps, secrets list and build env that WORKFLOW calls"],
];
// Probes for files that do not exist yet: a new file in a shipped root must deploy.
export const PROBES = [
  "src/__probe__/a.ts",
  "src/a.ts",
  "src/a/b/c.md",
  "src/a.md",
  "src/a/b.mdx",
  "public/a.txt",
  "public/a/b/c.md",
  "public/_headers",
  "cloudflare/a.ts",
  "package.json",
  "pnpm-lock.yaml",
];

export const isTest = (f) => /^src\/.*\.test\.tsx?$/.test(f) || f.startsWith("src/test/");
const isShipped = (f) => SHIPPED_DIRS.some((r) => f.startsWith(r.dir)) && !isTest(f);

/** Rule A: shipped files, root inputs and probes must deploy (mode "min"). */
export function ruleA(patterns, files) {
  const out = [];
  const need = new Set([...files.filter(isShipped), ...ROOT_INPUTS.map(([f]) => f), ...PROBES]);
  for (const f of need) if (decide(patterns, f, "min") !== "deploy") out.push(`A: ${f} is read by the build but could be skipped`);
  for (const [f, why] of ROOT_INPUTS) if (!files.includes(f)) out.push(`A: root input ${f} (${why}) is not tracked: update ROOT_INPUTS`);
  return out;
}

/** Rule D: a dot segment under a shipped root is a case GitHub's docs do not settle. */
export function ruleD(files) {
  return files
    .filter((f) => isShipped(f) && f.split("/").some((seg) => seg.startsWith(".")))
    .map((f) => `D: ${f} has a dot segment under a shipped root; the docs do not say a path filter matches it`);
}

// ----------------------------------------------------------- imports (B, C)

const SOURCE_EXT = /\.(ts|tsx|mts|js|mjs|cjs|css|md|mdx)$/;
const CODE_EXT = /\.(ts|tsx|mts|js|mjs|cjs|css)$/;
const RESOLVE_EXT = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs", ".json", ".css", ".md", ".mdx"];

/** Module specifiers: static and dynamic import, export from, require, CSS at-rules. */
export function specifiers(text) {
  const re =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|@import\s+(?:url\(\s*)?|@source\s+|@plugin\s+|@config\s+)(["'])([^"'\n]+)\1/g;
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m[2]);
  return out;
}

export function resolveSpec(spec, from, tracked) {
  let base;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith("./") || spec.startsWith("../")) base = posix.normalize(posix.join(posix.dirname(from), spec));
  else return null;
  for (const ext of RESOLVE_EXT) if (tracked.has(base + ext)) return base + ext;
  for (const ext of RESOLVE_EXT.slice(1)) if (tracked.has(`${base}/index${ext}`)) return `${base}/index${ext}`;
  return null;
}

/**
 * Rule B: a file that may ship (deploys under "max") must not import a file that
 * could be skipped (skip under "min"). read(path) returns the text.
 */
export function ruleB(patterns, files, read) {
  const tracked = new Set(files);
  const out = [];
  for (const f of files) {
    if (!SOURCE_EXT.test(f) || decide(patterns, f, "max") !== "deploy") continue;
    for (const spec of specifiers(read(f))) {
      const target = resolveSpec(spec, f, tracked);
      if (target && decide(patterns, target, "min") === "skip") out.push(`B: ${f} imports ${target}, which is on the skip list`);
    }
  }
  return out;
}

// Quoted strings that name a skipped folder, in code that ships, and are known
// not to read it. Each entry names the file, the text and the reason.
export const ALLOW = [
  { file: "eslint.config.mjs", text: '"tools/**"', why: "an eslint ignore glob; the build does not run eslint and nothing is read" },
];

const SKIP_DIRS = /["'`](?:\.{1,2}\/)*(?:scripts|tools|supabase|docs|\.github)\//;
const PATH_TOKEN = /(?:^|[\s"'=(])((?:\.{1,2}\/)*(?:scripts|tools|supabase|docs|\.github)\/[^\s"')`;&|]*)/g;

function pathTokens(text) {
  const out = [];
  let m;
  while ((m = PATH_TOKEN.exec(text))) out.push(m[1].replace(/^(?:\.{1,2}\/)+/, ""));
  return out;
}

/**
 * Rule C: code that ships must not hold a quoted path into a skipped folder (it
 * could read it at build or run time), and the build commands must not name a
 * path that could be skipped. Comment lines are not code.
 */
export function ruleC(patterns, files, read, buildLines) {
  const out = [];
  for (const f of files) {
    if (!CODE_EXT.test(f) || decide(patterns, f, "max") !== "deploy") continue;
    for (const [i, line] of read(f).split("\n").entries()) {
      const t = line.trim();
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
      if (SKIP_DIRS.test(line) && !ALLOW.some((a) => a.file === f && line.includes(a.text)))
        out.push(`C: ${f}:${i + 1} holds a quoted path into a folder that could be skipped`);
    }
  }
  for (const { where, text } of buildLines) {
    if (BUILD_ALLOW.some((a) => where.startsWith(`${a.file}:`) && text.trim() === a.text)) continue;
    for (const tok of pathTokens(text)) {
      const probe = tok.endsWith("/") ? `${tok}x` : tok;
      if (decide(patterns, probe, "min") === "skip") out.push(`C: ${where} names ${tok}, which could be skipped`);
    }
  }
  return out;
}

// Run lines in a workflow that name a path on the skip list and are known not
// to feed the build. Each entry names the file, the exact line and the reason.
export const BUILD_ALLOW = [
  {
    file: TARGET_WORKFLOW,
    text: 'node scripts/health/probe.mjs --base "$base" --with-health --attempts 3 --wait 20',
    why: "the check job runs after the deploy, against the live address; the build never reads the probe, and a change to it needs no deploy",
  },
];

/** The run: lines of one workflow file, as { where, text }. */
export function runLines(workflowText, path) {
  const lines = [];
  const wf = workflowText.split("\n");
  for (const [i, line] of wf.entries()) {
    const m = /^(\s*)(?:- )?run:\s*(.*)$/.exec(line);
    if (!m) continue;
    if (m[2] && m[2] !== "|" && m[2] !== ">") {
      lines.push({ where: `${path}:${i + 1}`, text: m[2] });
      continue;
    }
    const indent = m[1].length;
    for (let j = i + 1; j < wf.length; j++) {
      const lead = wf[j].length - wf[j].trimStart().length;
      if (wf[j].trim() && lead <= indent) break;
      lines.push({ where: `${path}:${j + 1}`, text: wf[j] });
    }
  }
  return lines;
}

/**
 * The strings the Worker build runs: cf:build, the OpenNext build command, and
 * the run: lines of the deploy workflow and of the one-target workflow it calls.
 */
export function buildLines(pkgText, openNextText, workflowText, targetText = "") {
  const lines = [];
  try {
    const s = JSON.parse(pkgText).scripts ?? {};
    for (const k of ["cf:build"]) if (s[k]) lines.push({ where: `package.json "${k}"`, text: s[k] });
  } catch {
    lines.push({ where: "package.json", text: "" });
  }
  const bc = /buildCommand:\s*(["'`])([^"'`\n]*)\1/.exec(openNextText);
  if (bc) lines.push({ where: "open-next.config.ts buildCommand", text: bc[2] });
  lines.push(...runLines(workflowText, WORKFLOW), ...runLines(targetText, TARGET_WORKFLOW));
  return lines;
}

// -------------------------------------------------------------------- run

/** deploy or no deploy for a set of changed files. */
export function judge(patterns, files) {
  const minDeploy = files.find((f) => decide(patterns, f, "min") === "deploy");
  const maxDeploy = files.find((f) => decide(patterns, f, "max") === "deploy");
  return {
    deploy: Boolean(minDeploy),
    first: minDeploy ?? null,
    uncertain: !minDeploy && Boolean(maxDeploy) ? maxDeploy : null,
    overLimit: files.length > DIFF_LIMIT,
  };
}

const readTarget = () => {
  try {
    return readFileSync(TARGET_WORKFLOW, "utf8");
  } catch {
    return "";
  }
};

const sh = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 28 });
const tracked = () => sh(["ls-files"]).split("\n").filter(Boolean);

function report(j) {
  console.log(j.deploy ? "deploy" : "no deploy");
  if (j.first) console.log(`first file that forces a deploy: ${j.first}`);
  if (j.uncertain) console.log(`note: ${j.uncertain} would deploy under the other reading of the docs; check the run after the push`);
  if (j.overLimit)
    console.log(`warning: more than ${DIFF_LIMIT} changed files. GitHub may judge this push wrongly; check by hand after the merge.`);
}

function main(argv) {
  let wfPath = WORKFLOW;
  const wi = argv.indexOf("--workflow");
  if (wi >= 0) {
    wfPath = argv[wi + 1];
    argv = [...argv.slice(0, wi), ...argv.slice(wi + 2)];
  }
  let patterns;
  const wfText = readFileSync(wfPath, "utf8");
  try {
    patterns = readList(wfText);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
    return 1;
  }
  if (argv[0] === "--files") {
    report(judge(patterns, argv.slice(1)));
    return 0;
  }
  if (argv[0] === "--diff") {
    const base = argv[1] ?? "origin/main";
    const head = argv[2] ?? "HEAD";
    const files = sh(["diff", "--name-only", "--no-renames", `${base}...${head}`]).split("\n").filter(Boolean);
    console.log(`${files.length} changed files`);
    report(judge(patterns, files));
    return 0;
  }
  const files = tracked();
  const read = (f) => readFileSync(f, "utf8");
  const bl = buildLines(read("package.json"), read("open-next.config.ts"), wfText, readTarget());
  const failures = [...ruleA(patterns, files), ...ruleB(patterns, files, read), ...ruleC(patterns, files, read, bl), ...ruleD(files)];
  const deploys = files.filter((f) => decide(patterns, f, "min") === "deploy").length;
  console.log(`${patterns.length} patterns; ${files.length} tracked files: ${deploys} deploy, ${files.length - deploys} skip (reading that skips the most)`);
  if (failures.length) {
    for (const f of failures) console.log(`FAIL ${f}`);
    return 1;
  }
  console.log("check OK");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
