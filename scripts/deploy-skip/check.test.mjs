// node --test scripts/deploy-skip/check.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WORKFLOW,
  buildLines,
  decide,
  judge,
  parsePattern,
  readList,
  ruleA,
  ruleB,
  ruleC,
  ruleD,
  specifiers,
} from "./check.mjs";

const wf = readFileSync(WORKFLOW, "utf8");
const list = readList(wf);
const d = (f, mode = "min") => decide(list, f, mode);

test("each pattern shape parses, and an unknown shape is refused", () => {
  for (const ok of ["**", "!docs/**", "!**/*.md", "!src/**/*.test.ts", "!vitest.config.ts", ".github/workflows/cloudflare-deploy.yml"])
    assert.doesNotThrow(() => parsePattern(ok), ok);
  for (const bad of ["*.md", "docs/*", "src/**/test/*.ts", "{a,b}/**", "!**/*", "src/[ab]/**", "**/x/**", "", "!"])
    assert.throws(() => parsePattern(bad), /not allowed/, bad);
});

test("the last matching pattern wins", () => {
  const p = ["**", "!docs/**", "docs/keep/**", "!docs/keep/x/**"].map(parsePattern);
  assert.equal(decide(p, "a.ts"), "deploy");
  assert.equal(decide(p, "docs/a.txt"), "skip");
  assert.equal(decide(p, "docs/keep/a.txt"), "deploy");
  assert.equal(decide(p, "docs/keep/x/a.txt"), "skip");
});

test("files that are prose, scripts, tests or migrations skip, in both readings", () => {
  for (const f of [
    "docs/x.md",
    "docs/img/a.png",
    "scripts/health/probe.mjs",
    "scripts/deploy-skip/check.mjs",
    ".github/workflows/health-monitor.yml",
    ".github/workflows/lighthouse.yml",
    "supabase/migrations/0001_init.sql",
    "tools/v3-design/README.md",
    "src/lib/a.test.ts",
    "src/components/a.test.tsx",
    "src/test/next-image-runtime-config.ts",
    "vitest.config.ts",
  ]) {
    assert.equal(d(f, "min"), "skip", `${f} min`);
    assert.equal(d(f, "max"), "skip", `${f} max`);
  }
});

test("a root README.md is the case the docs leave open: skip in one reading, flagged in the other", () => {
  assert.equal(d("README.md", "min"), "skip");
  assert.equal(d("README.md", "max"), "deploy");
  const j = judge(list, ["README.md"]);
  assert.equal(j.deploy, false);
  assert.equal(j.uncertain, "README.md");
  assert.equal(judge(list, ["docs/a.md"]).uncertain, null);
});

test("files the build reads deploy", () => {
  for (const f of [
    ".github/workflows/cloudflare-deploy.yml",
    "public/brand/README.md",
    "public/_headers",
    "src/app/x/page.md",
    "src/app/page.mdx",
    "src/lib/a.ts",
    "src/a.ts",
    "cloudflare/worker.ts",
    "package.json",
    "pnpm-lock.yaml",
    "wrangler.jsonc",
    "next.config.ts",
    "eslint.config.mjs",
  ])
    assert.equal(d(f, "min"), "deploy", f);
});

test("a mixed set deploys, a skip-only set does not", () => {
  assert.equal(judge(list, ["docs/a.md", "src/lib/a.ts"]).deploy, true);
  assert.equal(judge(list, ["docs/a.md", "src/lib/a.test.ts", "scripts/x.mjs"]).deploy, false);
  assert.equal(judge(list, ["docs/a.md", "scripts/x.mjs"]).first, null);
  assert.equal(judge(list, ["src/lib/a.ts"]).first, "src/lib/a.ts");
  assert.equal(judge(list, new Array(3001).fill("docs/a.md")).overLimit, true);
});

test("the list in the workflow passes the rules on the real tree", () => {
  const files = [
    ...ROOT,
    "src/app/page.tsx",
    "src/lib/a.ts",
    "src/lib/a.test.ts",
    "public/brand/README.md",
    "cloudflare/worker.ts",
    "scripts/x.mjs",
    "docs/a.md",
  ];
  assert.deepEqual(ruleA(list, files), []);
  assert.deepEqual(ruleD(files), []);
});

const ROOT = [
  "package.json",
  "pnpm-lock.yaml",
  "next.config.ts",
  "open-next.config.ts",
  "wrangler.jsonc",
  "wrangler.front.jsonc",
  "tsconfig.json",
  "postcss.config.mjs",
  "instrumentation.ts",
  "instrumentation-client.ts",
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  WORKFLOW,
];

test("rule A fails when a shipped path is added to the skip list", () => {
  const bad = readList(wf.replace('      - "!src/**/*.test.ts"', '      - "!src/lib/**"\n      - "!src/**/*.test.ts"'));
  const out = ruleA(bad, [...ROOT, "src/lib/a.ts"]);
  assert.ok(out.some((l) => l.includes("src/lib/a.ts")), out.join("\n"));
  const bad2 = readList(wf.replace('      - "src/**"\n', ""));
  assert.ok(ruleA(bad2, [...ROOT, "src/a.md"]).length > 0);
});

test("rule A fails for a missing root input", () => {
  assert.ok(ruleA(list, ROOT.filter((f) => f !== "wrangler.jsonc")).some((l) => l.includes("wrangler.jsonc")));
});

test("rule B fails when shipped code imports a skipped file", () => {
  const files = [...ROOT, "src/app/page.ts", "src/lib/ok.ts", "scripts/helper.mjs", "src/lib/a.test.ts"];
  const text = {
    "src/app/page.ts": `import { x } from "@/lib/ok";\nimport h from "../../scripts/helper.mjs";\n`,
  };
  const out = ruleB(list, files, (f) => text[f] ?? "");
  assert.equal(out.length, 1, out.join("\n"));
  assert.match(out[0], /src\/app\/page\.ts imports scripts\/helper\.mjs/);
  // A test file importing a script is fine: it is skipped too.
  assert.deepEqual(ruleB(list, files, (f) => (f === "src/lib/a.test.ts" ? `import "../../scripts/helper.mjs"` : "")), []);
  // A dynamic import and a CSS at-rule are seen.
  assert.deepEqual(specifiers(`const m = await import("./a"); @import "./b.css"; @source "../x"; require('c')`), ["./a", "./b.css", "../x", "c"]);
});

test("rule C fails for a made-up cf:build that calls a script and for a quoted path in shipped code", () => {
  const bl = buildLines(JSON.stringify({ scripts: { "cf:build": "node scripts/prep.mjs && opennextjs-cloudflare build" } }), "", wf);
  const out = ruleC(list, [], () => "", bl);
  assert.ok(out.some((l) => l.includes("scripts/prep.mjs")), out.join("\n"));
  const ok = buildLines(JSON.stringify({ scripts: { "cf:build": "opennextjs-cloudflare build" } }), `buildCommand: "pnpm exec next build --webpack"`, wf);
  assert.deepEqual(ruleC(list, [], () => "", ok), []);
  const code = ruleC(list, ["src/lib/a.ts"], () => `const p = "docs/x.md";\n// "docs/y.md" in a comment\n`, ok);
  assert.equal(code.length, 1, code.join("\n"));
  const run = buildLines("{}", "", "jobs:\n  a:\n    steps:\n      - run: node scripts/x.mjs\n");
  assert.ok(ruleC(list, [], () => "", run).length > 0);
});

test("rule D fails for a dot segment under a shipped root", () => {
  assert.equal(ruleD(["public/.well-known/security.txt", "src/lib/a.ts", ".gitignore"]).length, 1);
});

test("the list reader refuses a broken block", () => {
  assert.throws(() => readList("no markers here"), /markers missing/);
  assert.throws(() => readList(wf.replace("    paths:\n", "    paths-ignore:\n")), /paths/);
  assert.throws(() => readList(wf.replace('      - "**"\n', '      - "!docs/**"\n').replace('      - "!docs/**"\n      - "!docs/**"\n', '      - "!docs/**"\n')), /first pattern/);
  assert.throws(() => readList(wf.replace('"!tools/**"', '"!to*ls/**"')), /not allowed/);
});
