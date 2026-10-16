import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGET, EXPECTED_DEPLOYMENT, PROFILES, config, schedule, summarize } from './live-diagnostic.mjs';
import { comparisonSchedule, PREVIEWS, SLUGS } from './directory-comparison.mjs';
import { appliedSchedule, appliedConfig, ORIGIN, ROUTES } from './applied-throttling.mjs';

test('alternate measurement keeps all services, nine fixed public loads, default slow-4G values', () => {
  assert.equal(ORIGIN, 'https://www.mmg-lawfirm.com');
  assert.deepEqual(ROUTES, SLUGS);
  const jobs = appliedSchedule();
  assert.equal(jobs.length,9);
  for (const slug of ROUTES) assert.equal(jobs.filter(j=>j.slug===slug).length,3);
  assert.equal(new Set([jobs[0].slug,jobs[3].slug,jobs[6].slug]).size,3);
  const settings = appliedConfig().settings;
  assert.equal(settings.throttlingMethod,'devtools');
  assert.deepEqual(settings.blockedUrlPatterns,[]);
  assert.equal(settings.throttling,undefined); // retain Lighthouse's documented mobile defaults
  assert.equal(settings.formFactor,'mobile');
});

test('fixed public target, exact release and bounded rotated schedule', () => {
  assert.equal(TARGET, 'https://www.mmg-lawfirm.com/practice-areas/car-accidents');
  assert.equal(EXPECTED_DEPLOYMENT, 'dpl_2PVnV43GME8atoBasV2pfC9YVBFz');
  const jobs = schedule();
  assert.equal(jobs.length, 9);
  for (const name of Object.keys(PROFILES)) assert.equal(jobs.filter(j => j.profile === name).length, 3);
  assert.equal(new Set([jobs[0].profile, jobs[3].profile, jobs[6].profile]).size, 3);
});

test('baseline blocks nothing; isolated controls never block first-party, security or imagery', () => {
  assert.deepEqual(config('baseline').settings.blockedUrlPatterns, []);
  assert.deepEqual(config('without-ga-test-only').settings.blockedUrlPatterns, ['*://www.googletagmanager.com/*']);
  assert.deepEqual(config('without-posthog-test-only').settings.blockedUrlPatterns, ['*://*.posthog.com/*']);
  assert.throws(() => config('unknown'));
});

test('missing metrics stay unknown rather than being recorded as a pass', () => {
  const summary = summarize({});
  assert.equal(summary.performance, null);
  assert.equal(summary.seo, null);
  assert.equal(summary.cls, null);
});

test('preview comparison is bounded, paired and fixed to three priority routes', () => {
  const jobs = comparisonSchedule();
  assert.equal(jobs.length, 18);
  assert.deepEqual(Object.keys(PREVIEWS), ['baseline', 'candidate']);
  assert.deepEqual(SLUGS, ['car-accidents', 'truck-accidents', 'motorcycle-accidents']);
  for (const slug of SLUGS) for (const profile of Object.keys(PREVIEWS)) {
    assert.equal(jobs.filter(j => j.slug === slug && j.profile === profile).length, 3);
  }
});

test('manual diagnostic job has no secrets, deployment commands or public report upload', () => {
  const workflow = readFileSync('.github/workflows/lighthouse.yml', 'utf8');
  const job = workflow.split('\n  live-car-diagnostics:')[1];
  assert.ok(job);
  assert.ok(job.includes("github.event_name == 'workflow_dispatch'"));
  assert.ok(job.includes('contents: read'));
  assert.ok(job.includes('lighthouse@13.5.0'));
  assert.doesNotMatch(job, /secrets\.|temporaryPublicStorage|vercel|--prod|--no-sandbox/);
  assert.ok(workflow.indexOf('treosh/lighthouse-ci-action@v12') < workflow.indexOf('\n  live-car-diagnostics:'));
});
