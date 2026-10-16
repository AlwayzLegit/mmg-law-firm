import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGETS, HEROES, checkPreloads, checkRequests } from './monitoring-comparison.mjs';
const slug = 'car-accidents', target = TARGETS.candidate;
const ga = 'https://www.googletagmanager.com/gtag/js?id=G-XTQTZ6YCMG';
const src = w => `/_next/image?url=${encodeURIComponent(HEROES[slug])}&w=${w}&q=65`;
const google = `<link rel="preload" as="script" href="${ga}"/>`;
const hero = `<link rel="preload" as="image" fetchPriority="high" imageSrcSet="${src(1920)} 1x, ${src(3840)} 2x"/>`;
test('both fixed previews preserve the same q65 artwork and Google preload', () => {
  checkPreloads(google + hero, target, slug);
  checkPreloads(google + hero, TARGETS.baseline, slug);
  assert.notEqual(target.origin, TARGETS.baseline.origin);
  assert.notEqual(target.deployment, TARGETS.baseline.deployment);
  assert.throws(() => checkPreloads(google + hero.replaceAll('q=65', 'q=75'), target, slug), /quality/);
  assert.throws(() => checkPreloads(google + hero + hero, target, slug), /one/);
  assert.throws(() => checkPreloads(hero, target, slug), /Google/);
  assert.throws(() => checkPreloads(google.replace('/>', ' fetchPriority="low"/>') + hero, target, slug), /Google/);
});
test('real Google and PostHog plus one original hero remain required', () => {
  const requests = [{ url: ga, statusCode: 200, priority: 'High' }, { url: 'https://us-assets.i.posthog.com/array/test/config.js', statusCode: 200 }, { url: target.origin + src(3840), statusCode: 200, priority: 'High', transferSize: 48069 }];
  assert.equal(checkRequests(requests, target, slug).bytes, 48069);
  assert.throws(() => checkRequests(requests, TARGETS.baseline, slug), /Unexpected/);
  assert.throws(() => checkRequests([requests[0], requests[2]], target, slug), /PostHog/);
  assert.throws(() => checkRequests([...requests, requests[2]], target, slug), /one/);
});
test('diagnostic retains all results and actual script transfer without credentials', () => {
  const workflow = readFileSync('.github/workflows/lighthouse.yml', 'utf8').split('\n  live-car-diagnostics:')[1];
  assert.ok(workflow.includes("if: inputs.target == 'monitoring-comparison'"));
  assert.ok(workflow.includes('outputs/monitoring-comparison-135/'));
  assert.ok(workflow.includes('node --test tools/performance/monitoring-comparison.test.mjs'));
  assert.ok(workflow.includes('if: always()'));
  assert.doesNotMatch(workflow, /secrets\.|temporaryPublicStorage|vercel|--prod|--no-sandbox/);
  const script = readFileSync('tools/performance/monitoring-comparison.mjs', 'utf8');
  assert.ok(script.includes('record.scriptTransfer = record.scriptRequests.reduce'));
  assert.ok(script.includes("throw new Error('Script request failure')"));
  assert.ok(script.includes('results.length !== 18'));
  assert.doesNotMatch(script, /captureException\(|generate_lead|\/api\/leads|blockedUrlPatterns/);
});
