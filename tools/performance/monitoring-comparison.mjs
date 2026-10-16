/** Fixed-preview, read-only monitoring-loader comparison. No credentials or submissions. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { summarize } from './live-diagnostic.mjs';
import { comparisonConfig, comparisonSchedule, inspectHtml, SLUGS } from './toast-comparison.mjs';
export const TARGETS = {
  baseline: { origin: 'https://mmg-law-firm-6y7tg6jsx-alwayzlegits-projects.vercel.app', deployment: 'dpl_Dksdi5QC6cWqyoUEpfPWsR6hPn1t', sha: '3e75f473a40ab0af44e03eaa922a3397bb3dad72', quality: '65' },
  candidate: { origin: 'https://mmg-law-firm-3a476exe3-alwayzlegits-projects.vercel.app', deployment: 'dpl_HKmEcp4yNd7BvHwYJDpaS2B22fgS', sha: '61502227ceac9abb5832ba24188d20b721a91f47', quality: '65' },
};
export const HEROES = {
  'car-accidents': '/v3/photos/car-accident-hero.webp',
  'truck-accidents': '/v3/photos/truck-highway-hero.webp',
  'motorcycle-accidents': '/v3/moto-photos/motorcycle-coastal-highway-hero.webp',
};
const gaUrl = 'https://www.googletagmanager.com/gtag/js?id=G-XTQTZ6YCMG';
export function checkPreloads(html, target, slug) {
  const links = html.match(/<link\b[^>]*>/g) ?? [];
  const google = links.filter(t => t.includes(gaUrl));
  if (google.length !== 1 || !google[0].includes('rel="preload"') || /fetchpriority=/i.test(google[0])) throw new Error('Google preload changed');
  const hero = links.filter(t => t.includes(encodeURIComponent(HEROES[slug])) && t.includes('as="image"'));
  if (hero.length !== 1 || !hero[0].includes('rel="preload"') || !/fetchpriority="high"/i.test(hero[0])) throw new Error('Expected one high-priority hero preload');
  const candidates = (hero[0].match(/imagesrcset="([^"]+)"/i)?.[1] ?? '').replaceAll('&amp;', '&').split(',').map(s => s.trim().split(' ')[0]);
  if (candidates.length !== 2) throw new Error('Expected original two hero candidates');
  for (const src of candidates) {
    const u = new URL(src, target.origin);
    if (u.pathname !== '/_next/image' || u.searchParams.get('url') !== HEROES[slug] || u.searchParams.get('q') !== target.quality) throw new Error('Unexpected hero source or quality');
  }
}
export function checkRequests(requests, target, slug) {
  const google = requests.filter(r => r.url === gaUrl);
  if (google.length !== 1 || google[0].statusCode !== 200 || google[0].priority !== 'High') throw new Error('Google resource/priority changed');
  if (!requests.some(r => new URL(r.url).hostname.endsWith('.posthog.com') && r.statusCode === 200)) throw new Error('PostHog resource missing');
  const hero = requests.filter(r => { const u = new URL(r.url); return u.pathname === '/_next/image' && u.searchParams.get('url') === HEROES[slug]; });
  if (hero.length !== 1 || hero[0].statusCode !== 200 || hero[0].priority !== 'High') throw new Error('Expected one successful high-priority hero request');
  const u = new URL(hero[0].url);
  if (u.origin !== target.origin || u.searchParams.get('q') !== target.quality || u.searchParams.get('w') !== '3840' || !(hero[0].transferSize > 0)) throw new Error('Unexpected hero request');
  return { url: hero[0].url, priority: hero[0].priority, bytes: hero[0].transferSize, resourceSize: hero[0].resourceSize, start: hero[0].networkRequestTime, end: hero[0].networkEndTime, mimeType: hero[0].mimeType, googlePriority: google[0].priority };
}
async function verify(target, slug) {
  const response = await fetch(`${target.origin}/practice-areas/${slug}`, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (response.status !== 200) throw new Error(`Preview HTTP${response.status}`);
  const html = await response.text();
  checkPreloads(html, target, slug);
  return inspectHtml(html, response.headers, target, slug);
}
async function run() {
  const out = resolve('outputs/monitoring-comparison-135');
  mkdirSync(out, { recursive: true });
  const baseline = new Map(), results = [], keys = ['title', 'description', 'canonical', 'textHash', 'csp'];
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
      record.hero = checkRequests(requests, target, item.slug);
      record.totalTransfer = requests.reduce((n, r) => n + r.transferSize, 0);
      record.scriptRequests = requests.filter(r => r.resourceType === 'Script').map(r => ({ url: r.url, transferSize: r.transferSize, resourceSize: r.resourceSize, statusCode: r.statusCode, finished: r.finished }));
      if (record.scriptRequests.some(r => r.statusCode !== 200 || !r.finished)) throw new Error('Script request failure');
      record.scriptTransfer = record.scriptRequests.reduce((n, r) => n + r.transferSize, 0);
      if (record.runtimeError || record.url !== url || record.performance == null || record.throttlingMethod !== 'devtools') throw new Error('Invalid measurement');
    } catch (error) { record.error = error.message; failed = true; }
    finally {
      if (record.before) {
        try { record.after = await verify(target, item.slug); if (JSON.stringify(record.before) !== JSON.stringify(record.after)) throw new Error('Page changed during audit'); }
        catch (error) { record.afterError = error.message; failed = true; }
      }
    }
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ targets: TARGETS, method: 'Same-runner adjacent alternating pairs; applied mobile throttling; all real services; retain every result.', results }, null, 2));
    console.log(JSON.stringify(record));
    if (!record.before || !record.after || record.afterError || record.error?.startsWith('Concurrent')) break;
  }
  if (failed || results.length !== 18) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
