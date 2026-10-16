/** Fixed-preview resource-priority diagnostic. No credentials, blocking or submissions. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { summarize } from './live-diagnostic.mjs';
import { comparisonConfig, comparisonSchedule, inspectHtml, SLUGS } from './toast-comparison.mjs';

export const TARGETS = {
  baseline: { origin: 'https://mmg-law-firm-cvaysdg4x-alwayzlegits-projects.vercel.app', deployment: 'dpl_7DSPgqptdYT4FFfGPWJHE3WXcb2u', sha: '86d7ead85290653bbd0e0aa928627daab2621f7e', priority: null },
  candidate: { origin: 'https://mmg-law-firm-28yztc6or-alwayzlegits-projects.vercel.app', deployment: 'dpl_2iU4xSATBq6ScGXskN3ndBSrCJSD', sha: '15fee2e7eed4a509ebd4686483e58680dfe7452c', priority: 'low' },
};
const gaUrl = 'https://www.googletagmanager.com/gtag/js?id=G-XTQTZ6YCMG';
export function checkPreload(html, target) {
  const tags = (html.match(/<link\b[^>]*>/g) ?? []).filter(t => t.includes(gaUrl));
  if (tags.length !== 1 || !tags[0].includes('rel="preload"') || !tags[0].includes('as="script"')) throw new Error('Expected one Google tag preload');
  const actual = tags[0].match(/fetchpriority="([^"]+)"/i)?.[1] ?? null;
  if (actual !== target.priority) throw new Error('Unexpected Google preload priority');
}
export function checkRequests(requests, profile) {
  const google = requests.filter(r => r.url === gaUrl);
  if (google.length !== 1 || google[0].statusCode !== 200) throw new Error('Expected one successful Google tag request');
  if (google[0].priority !== (profile === 'candidate' ? 'Low' : 'High')) throw new Error('Priority hint not reflected in measured request');
  if (!requests.some(r => new URL(r.url).hostname.endsWith('.posthog.com') && r.statusCode === 200)) throw new Error('PostHog resource missing');
  return { priority: google[0].priority, start: google[0].networkRequestTime, end: google[0].networkEndTime, bytes: google[0].transferSize };
}
async function verify(target, slug) {
  const response = await fetch(`${target.origin}/practice-areas/${slug}`, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (response.status !== 200) throw new Error(`Preview HTTP${response.status}`);
  const html = await response.text();
  checkPreload(html, target);
  return inspectHtml(html, response.headers, target, slug);
}
async function run() {
  const out = resolve('outputs/google-priority-comparison-132');
  mkdirSync(out, { recursive: true });
  const baseline = new Map(), results = [];
  const keys = ['title', 'description', 'canonical', 'textHash', 'csp'];
  let failed = false;
  for (const slug of SLUGS) {
    const before = await verify(TARGETS.baseline, slug), after = await verify(TARGETS.candidate, slug);
    for (const key of keys) if (before[key] !== after[key]) throw new Error(`Concurrent ${slug} ${key} difference`);
    baseline.set(slug, before);
  }
  for (const item of comparisonSchedule()) {
    const target = TARGETS[item.profile], url = `${target.origin}/practice-areas/${item.slug}`;
    const prefix = resolve(out, `${item.round}-${item.slug}-${item.profile}`), record = { ...item, url };
    results.push(record);
    try {
      record.before = await verify(target, item.slug);
      for (const key of keys) if (record.before[key] !== baseline.get(item.slug)[key]) throw new Error(`Concurrent ${key} difference`);
      writeFileSync(`${prefix}.config.mjs`, `export default ${JSON.stringify(comparisonConfig(), null, 2)};\n`);
      const execution = spawnSync('lighthouse', [url, `--config-path=${prefix}.config.mjs`, '--chrome-flags=--headless', '--output=json', '--output=html', `--output-path=${prefix}`, '--save-assets', '--quiet'], { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      writeFileSync(`${prefix}.log`, `${execution.stdout ?? ''}\n${execution.stderr ?? ''}`);
      if (execution.error || execution.status !== 0) throw new Error(execution.error?.message ?? `Lighthouse exit ${execution.status}`);
      const report = JSON.parse(readFileSync(`${prefix}.report.json`, 'utf8'));
      Object.assign(record, summarize(report));
      record.benchmark = report.environment.benchmarkIndex;
      record.throttlingMethod = report.configSettings.throttlingMethod;
      record.throttling = report.configSettings.throttling;
      const requests = report.audits['network-requests'].details.items;
      record.google = checkRequests(requests, item.profile);
      record.totalTransfer = requests.reduce((n, r) => n + r.transferSize, 0);
      if (record.runtimeError || record.url !== url || record.performance == null || record.throttlingMethod !== 'devtools') throw new Error('Invalid measurement');
    } catch (error) { record.error = error.message; failed = true; }
    finally {
      if (record.before) {
        try { record.after = await verify(target, item.slug); if (JSON.stringify(record.before) !== JSON.stringify(record.after)) throw new Error('Page changed during audit'); }
        catch (error) { record.afterError = error.message; failed = true; }
      }
    }
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ targets: TARGETS, method: 'Same-runner adjacent pairs; applied mobile throttling; all real services; preserve every result.', results }, null, 2));
    console.log(JSON.stringify(record));
    if (!record.before || !record.after || record.afterError || record.error?.startsWith('Concurrent')) break;
  }
  if (failed || results.length !== 18) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
