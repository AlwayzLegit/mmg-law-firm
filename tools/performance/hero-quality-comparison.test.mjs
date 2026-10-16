import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGETS, HEROES, checkPreloads, checkRequests } from './hero-quality-comparison.mjs';
const slug = 'car-accidents', target = TARGETS.candidate;
const ga = 'https://www.googletagmanager.com/gtag/js?id=G-XTQTZ6YCMG';
const src = w => `/_next/image?url=${encodeURIComponent(HEROES[slug])}&w=${w}&q=65`;
const google = `<link rel="preload" as="script" href="${ga}"/>`;
const hero = `<link rel="preload" as="image" fetchPriority="high" imageSrcSet="${src(1920)} 1x, ${src(3840)} 2x"/>`;
test('original image with two q65 preload candidates, no duplicate or analytics changes', () => {
  checkPreloads(google + hero, target, slug);
  assert.throws(() => checkPreloads(google + hero, TARGETS.baseline, slug), /quality/);
  assert.throws(() => checkPreloads(google + hero + hero, target, slug), /one/);
  assert.throws(() => checkPreloads(hero, target, slug), /Google/);
  assert.throws(() => checkPreloads(google.replace('/>', ' fetchPriority="low"/>') + hero, target, slug), /Google/);
});
test('one actual correctly optimized hero and unchanged real services required', () => {
  const requests = [{ url: ga, statusCode: 200, priority: 'High' }, { url: 'https://us-assets.i.posthog.com/array/test/config.js', statusCode: 200 }, { url: target.origin + src(3840), statusCode: 200, priority: 'High', transferSize: 48069 }];
  assert.equal(checkRequests(requests, target, slug).bytes, 48069);
  assert.throws(() => checkRequests(requests, TARGETS.baseline, slug), /Unexpected/);
  assert.throws(() => checkRequests([requests[0], requests[2]], target, slug), /PostHog/);
  assert.throws(() => checkRequests([...requests, requests[2]], target, slug), /one/);
  assert.throws(() => checkRequests(requests.slice(0, 2), target, slug), /one/);
});
test('manual diagnostic preserves reports, no credentials or security bypass', () => {
  const workflow = readFileSync('.github/workflows/lighthouse.yml', 'utf8').split('\n  live-car-diagnostics:')[1];
  assert.ok(workflow.includes("if: inputs.target == 'hero-quality-comparison'"));
  assert.ok(workflow.includes('outputs/hero-quality-comparison-134/'));
  assert.ok(workflow.includes('node --test tools/performance/hero-quality-comparison.test.mjs'));
  assert.ok(workflow.includes('if: always()'));
  assert.doesNotMatch(workflow, /secrets\.|temporaryPublicStorage|vercel|--prod|--no-sandbox/);
});
