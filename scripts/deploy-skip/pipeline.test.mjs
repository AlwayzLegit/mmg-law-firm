// node --test scripts/deploy-skip/pipeline.test.mjs
// OPS-58: plain text checks on the deploy pipeline. A merge to main deploys
// staging, checks it, and deploys production only when that check is green.
// No YAML parser (Node built-ins only): the files are read as text, job by job.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { TARGET_WORKFLOW, WORKFLOW } from "./check.mjs";

const caller = readFileSync(WORKFLOW, "utf8");
const target = readFileSync(TARGET_WORKFLOW, "utf8");

/** The text of one top-level job (two-space indent) under `jobs:`. */
function job(text, name) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => l === `  ${name}:`);
  assert.ok(start >= 0, `job ${name} not found`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

const noComments = (t) =>
  t
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");

test("the caller has the three jobs and the target workflow has deploy and check", () => {
  for (const n of ["staging", "production", "production-by-hand"]) assert.ok(job(caller, n).length > 0, n);
  for (const n of ["deploy", "check"]) assert.ok(job(target, n).length > 0, n);
  assert.match(target, /^on:\n {2}workflow_call:/m, "the target workflow starts only by workflow_call");
  assert.doesNotMatch(target, /^ {2}(push|workflow_dispatch|schedule|pull_request):/m);
});

test("production needs staging and has no condition that lets it run after a failure", () => {
  const p = noComments(job(caller, "production"));
  assert.match(p, /^ {4}needs: staging$/m);
  const ifLine = p.split("\n").find((l) => /^ {4}if:/.test(l)) ?? "";
  assert.ok(ifLine, "production has an if");
  for (const bad of ["always()", "!cancelled()", "failure()", "cancelled()"]) assert.ok(!ifLine.includes(bad), `if holds ${bad}`);
  for (const bad of ["always()", "!cancelled()", "failure()"]) assert.ok(!p.includes(bad), `job holds ${bad}`);
  assert.match(p, /uses: \.\/\.github\/workflows\/cloudflare-deploy-target\.yml/);
  assert.match(p, /target: production/);
});

test("the check of the target needs its deploy, and the target holds no always()", () => {
  const c = noComments(job(target, "check"));
  assert.match(c, /^ {4}needs: deploy$/m);
  assert.doesNotMatch(noComments(target), /always\(\)|!cancelled\(\)|failure\(\)/);
  // No environment and no secret in the check: it reads the public site.
  assert.doesNotMatch(c, /environment:|secrets\./);
});

test("staging never gets cron_enabled true, and a rehearsal never reaches production", () => {
  const s = noComments(job(caller, "staging"));
  assert.match(s, /target: staging/);
  assert.doesNotMatch(s, /cron_enabled/);
  assert.match(noComments(job(caller, "production")), /rehearsal: \$\{\{ inputs\.target == 'rehearse-gate' \}\}/);
  assert.match(noComments(job(caller, "production")), /cron_enabled: true/);
  // The guard refuses both wrong pairs before anything is installed.
  const guard = target.slice(target.indexOf("- name: Guard"), target.indexOf("- name: Move hosts off Vercel"));
  assert.match(guard, /staging must not run scheduled jobs/);
  assert.match(guard, /a rehearsal never reaches production/);
  assert.match(guard, /unknown target/);
  assert.match(target, /CRON_ENABLED: \$\{\{ inputs\.target == 'production' && inputs\.cron_enabled && '1' \|\| '0' \}\}/);
});

test("no fallback to production remains in either file", () => {
  for (const [name, text] of [["caller", caller], ["target", target]]) {
    assert.doesNotMatch(noComments(text), /\|\| 'production'/, `${name} still falls back to production`);
  }
});

test("the workflow level and the job level concurrency groups differ", () => {
  const top = /^concurrency:\n {2}group: (.*)$/m.exec(caller);
  assert.ok(top, "caller has a workflow level group");
  const inner = /^ {4}concurrency:\n {6}group: (.*)$/m.exec(target);
  assert.ok(inner, "the deploy job has a job level group");
  // Same prefix before the first ${{ would be a deadlock risk: compare the literal start.
  const lit = (g) => g.split("${{")[0];
  assert.notEqual(lit(top[1]), lit(inner[1]));
  assert.notEqual(top[1], inner[1]);
  assert.match(inner[1], /cloudflare-target-\$\{\{ inputs\.target \}\}/);
});

test("the rehearsal option exists and the by-hand production job is only for a hand run", () => {
  assert.match(caller, /options: \[staging, production, rehearse-gate\]/);
  assert.match(noComments(job(caller, "production-by-hand")), /if: github\.event_name == 'workflow_dispatch' && inputs\.target == 'production'/);
  assert.match(noComments(job(caller, "staging")), /if: github\.event_name == 'push' \|\| inputs\.target == 'staging' \|\| inputs\.target == 'rehearse-gate'/);
});

test("every called job passes the secrets on", () => {
  for (const n of ["staging", "production", "production-by-hand"]) assert.match(job(caller, n), /secrets: inherit/, n);
});
