/** Paired, fixed-preview diagnostics. No authentication, service blocking or submissions. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config, summarize } from './live-diagnostic.mjs';

// Both exact deployments were authenticated and verified READY before dispatch.
export const TARGETS = {
  baseline: { origin: 'https://mmg-law-firm-cvaysdg4x-alwayzlegits-projects.vercel.app', deployment: 'dpl_7DSPgqptdYT4FFfGPWJHE3WXcb2u', sha: '86d7ead85290653bbd0e0aa928627daab2621f7e' },
  candidate: { origin: 'https://mmg-law-firm-idc5zb5sq-alwayzlegits-projects.vercel.app', deployment: 'dpl_EAGm7BZkFeMYzfKif5u663DaRJCP', sha: 'e85c0ee7debff301657afec37af92801b5412df5' },
};
export const SLUGS = ['car-accidents', 'truck-accidents', 'motorcycle-accidents'];
export function comparisonSchedule() {
  return Array.from({ length: 3 }, (_, round) => SLUGS.flatMap((slug, index) =>
    ((round + index) % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'])
      .map(profile => ({ round: round + 1, slug, profile })),
  )).flat();
}
export function comparisonConfig() {
  const base = config('baseline');
  return { ...base, settings: { ...base.settings, throttlingMethod: 'devtools' } };
}
export function inspectHtml(html, headers, target, slug) {
  const deployments = [...new Set(html.match(/dpl_[A-Za-z0-9]+/g) ?? [])];
  if (deployments.length !== 1 || deployments[0] !== target.deployment) throw new Error('Unverified deployment');
  if (headers.get('x-robots-tag')?.trim().toLowerCase() !== 'noindex') throw new Error('Expected preview indexing guard missing');
  if (!html.includes('G-XTQTZ6YCMG')) throw new Error('Expected analytics initialization missing');
  const title = html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!title || !description || !main || canonical !== `https://www.mmg-lawfirm.com/practice-areas/${slug}`) throw new Error('Unexpected metadata or page body');
  const text = main.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return { deployment: deployments[0], title, description, canonical, textHash: createHash('sha256').update(text).digest('hex'), csp: headers.get('content-security-policy') };
}
async function verify(target, slug) {
  const url = `${target.origin}/practice-areas/${slug}`;
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (response.status !== 200) throw new Error(`Preview HTTP${response.status}`);
  return inspectHtml(await response.text(), response.headers, target, slug);
}
async function run() {
  const out = resolve('outputs/toast-comparison-131');
  mkdirSync(out, { recursive: true });
  const baseline = new Map(), results = [];
  let failed = false;
  // Compare fresh body/meta/security BEFORE any audits; do not test differing content.
  for (const slug of SLUGS) {
    const before = await verify(TARGETS.baseline, slug), after = await verify(TARGETS.candidate, slug);
    for (const key of ['title', 'description', 'canonical', 'textHash', 'csp']) if (before[key] !== after[key]) throw new Error(`Concurrent content/security difference: ${slug} ${key}`);
    baseline.set(slug, before);
  }
  for (const item of comparisonSchedule()) {
    const target = TARGETS[item.profile], url = `${target.origin}/practice-areas/${item.slug}`;
    const prefix = resolve(out, `${item.round}-${item.slug}-${item.profile}`), record = { ...item, url };
    results.push(record);
    try {
      record.before = await verify(target, item.slug);
      for (const key of ['title', 'description', 'canonical', 'textHash', 'csp']) if (record.before[key] !== baseline.get(item.slug)[key]) throw new Error(`Concurrent ${key} difference`);
      writeFileSync(`${prefix}.config.mjs`, `export default ${JSON.stringify(comparisonConfig(), null, 2)};\n`);
      const processResult = spawnSync('lighthouse', [url, `--config-path=${prefix}.config.mjs`, '--chrome-flags=--headless', '--output=json', '--output=html', `--output-path=${prefix}`, '--save-assets', '--quiet'], { encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
      writeFileSync(`${prefix}.log`, `${processResult.stdout ?? ''}\n${processResult.stderr ?? ''}`);
      if (processResult.error || processResult.status !== 0) throw new Error(processResult.error?.message ?? `Lighthouse exit ${processResult.status}`);
      const report = JSON.parse(readFileSync(`${prefix}.report.json`, 'utf8'));
      Object.assign(record, summarize(report));
      record.benchmark = report.environment.benchmarkIndex;
      record.throttlingMethod = report.configSettings.throttlingMethod;
      record.throttling = report.configSettings.throttling;
      const requests = report.audits['network-requests'].details.items;
      record.totalTransfer = requests.reduce((n, r) => n + r.transferSize, 0);
      record.sonner = requests.filter(r => r.url.includes('15hgvp3s.kkmo.js')).map(r => ({ status: r.statusCode, transferSize: r.transferSize }));
      record.services = requests.filter(r => /googletagmanager\.com|posthog\.com/.test(r.url)).map(r => ({ host: new URL(r.url).hostname, status: r.statusCode, transferSize: r.transferSize }));
      if (!record.services.some(r => r.host === 'www.googletagmanager.com' && r.status === 200) || !record.services.some(r => r.host.endsWith('.posthog.com') && r.status === 200)) throw new Error('Required analytics resource absent');
      if (record.runtimeError || record.url !== url || record.performance == null || record.throttlingMethod !== 'devtools') throw new Error('Invalid measurement');
      if (record.sonner.length !== (item.profile === 'baseline' ? 1 : 0)) throw new Error('Unexpected Sonner loading');
    } catch (error) { record.error = error.message; failed = true; }
    finally {
      if (record.before) {
        try { record.after = await verify(target, item.slug); if (JSON.stringify(record.before) !== JSON.stringify(record.after)) throw new Error('Page changed during audit'); }
        catch (error) { record.afterError = error.message; failed = true; }
      }
    }
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ targets: TARGETS, method: 'Same-runner paired applied-throttling; retain all results; does not replace simulated reports.', results }, null, 2));
    console.log(JSON.stringify(record));
    if (!record.before || !record.after || record.afterError || record.error?.startsWith('Concurrent')) break;
  }
  if (failed || results.length !== 18) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
