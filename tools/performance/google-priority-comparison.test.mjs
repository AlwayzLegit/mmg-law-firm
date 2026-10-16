import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGETS, checkPreload, checkRequests } from './google-priority-comparison.mjs';
const src = 'https://www.googletagmanager.com/gtag/js?id=G-XTQTZ6YCMG';
test('single verified priority preload required, no missing or duplicated tags', () => {
  const base = `<link rel="preload" as="script" href="${src}"/>`;
  const candidate = base.replace('/>', ' fetchPriority="low"/>');
  checkPreload(base, TARGETS.baseline);
  checkPreload(candidate, TARGETS.candidate);
  assert.throws(() => checkPreload(base, TARGETS.candidate), /priority/);
  assert.throws(() => checkPreload(candidate, TARGETS.baseline), /priority/);
  assert.throws(() => checkPreload(candidate + candidate, TARGETS.candidate), /one/);
});
test('real Google and PostHog requests required with the measured priority', () => {
  const requests = [{ url: src, statusCode: 200, priority: 'Low' }, { url: 'https://us-assets.i.posthog.com/array/test/config.js', statusCode: 200 }];
  assert.equal(checkRequests(requests, 'candidate').priority, 'Low');
  assert.throws(() => checkRequests(requests, 'baseline'), /Priority/);
  assert.throws(() => checkRequests(requests.slice(0, 1), 'candidate'), /PostHog/);
  assert.throws(() => checkRequests([...requests, requests[0]], 'candidate'), /one/);
});
test('manual read-only runner retains failed reports without credential exposure', () => {
  const workflow = readFileSync('.github/workflows/lighthouse.yml', 'utf8').split('\n  live-car-diagnostics:')[1];
  assert.ok(workflow.includes("if: inputs.target == 'google-priority-comparison'"));
  assert.ok(workflow.includes('outputs/google-priority-comparison-132/'));
  assert.ok(workflow.includes('node --test tools/performance/google-priority-comparison.test.mjs'));
  assert.ok(workflow.includes('if: always()'));
  assert.doesNotMatch(workflow, /secrets\.|temporaryPublicStorage|vercel|--prod|--no-sandbox/);
});
