import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGETS, SLUGS, comparisonSchedule, comparisonConfig, inspectHtml } from './toast-comparison.mjs';

test('bounded adjacent pairs, all three routes, both test orders', () => {
  const jobs = comparisonSchedule();
  assert.equal(jobs.length, 18);
  for (const slug of SLUGS) for (const profile of Object.keys(TARGETS)) assert.equal(jobs.filter(j => j.slug === slug && j.profile === profile).length, 3);
  for (let i = 0; i < jobs.length; i += 2) { assert.equal(jobs[i].slug, jobs[i+1].slug); assert.equal(jobs[i].round, jobs[i+1].round); assert.notEqual(jobs[i].profile, jobs[i+1].profile); }
  assert.equal(new Set(jobs.filter((_, i) => i % 2 === 0).map(j => j.profile)).size, 2);
});
test('same mobile CPU/network configuration, no service suppression or credentials', () => {
  const c = comparisonConfig();
  assert.equal(c.settings.formFactor, 'mobile');
  assert.equal(c.settings.throttlingMethod, 'devtools');
  assert.deepEqual(c.settings.blockedUrlPatterns, []);
  assert.equal(c.settings.throttling, undefined);
  assert.equal(c.settings.extraHeaders, undefined);
});
test('fresh HTML requires exact deployment, canonical, metadata, body and preview noindex', () => {
  const target=TARGETS.baseline, headers=new Headers({'x-robots-tag':'noindex','content-security-policy':"default-src 'self'"});
  const html=`<title>Frozen title</title><meta name="description" content="Frozen description"/><link rel="canonical" href="https://www.mmg-lawfirm.com/practice-areas/car-accidents"/><main><h1>Body</h1></main>${target.deployment} G-XTQTZ6YCMG`;
  assert.equal(inspectHtml(html,headers,target,'car-accidents').title,'Frozen title');
  assert.throws(()=>inspectHtml(html,headers,TARGETS.candidate,'car-accidents'),/deployment/);
  assert.throws(()=>inspectHtml(html,new Headers(),target,'car-accidents'),/guard/);
  assert.throws(()=>inspectHtml(html.replace('G-XTQTZ6YCMG',''),headers,target,'car-accidents'),/analytics/);
  assert.throws(()=>inspectHtml(html,headers,target,'truck-accidents'),/metadata/);
  assert.throws(()=>inspectHtml(html.replace('<main>','<div>').replace('</main>','</div>'),headers,target,'car-accidents'),/body/);
});
test('diagnostic job stays manual, no secrets or deployments, failures retained', () => {
  const workflow=readFileSync('.github/workflows/lighthouse.yml','utf8').split('\n  live-car-diagnostics:')[1];
  assert.ok(workflow.includes("if: inputs.target == 'toast-comparison'"));
  assert.ok(workflow.includes('node --test tools/performance/toast-comparison.test.mjs'));
  assert.ok(workflow.includes('outputs/toast-comparison-131/'));
  assert.doesNotMatch(workflow,/secrets\.|temporaryPublicStorage|vercel|--prod|--no-sandbox/);
  assert.ok(workflow.includes('if: always()'));
});
