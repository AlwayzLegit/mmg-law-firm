/** Fixed unauthenticated previews. No service blocking, credentials or submissions. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config, summarize } from './live-diagnostic.mjs';

export const PREVIEWS = {
  baseline: { origin: 'https://mmg-law-firm-4zl7iwdxv-alwayzlegits-projects.vercel.app', deployment: 'dpl_CcEWGGZPYG5U4pzpTuh3xxBAKivr' },
  candidate: { origin: 'https://mmg-law-firm-nxbjh3148-alwayzlegits-projects.vercel.app', deployment: 'dpl_6EBvKdjrDNQxXM6WuvypnP3WmmA4' },
};
export const SLUGS = ['car-accidents', 'truck-accidents', 'motorcycle-accidents'];

export function comparisonSchedule() {
  return Array.from({ length: 3 }, (_, round) => SLUGS.flatMap((slug, index) =>
    ((round + index) % 2 ? ['candidate', 'baseline'] : ['baseline', 'candidate'])
      .map(profile => ({ round: round + 1, slug, profile })),
  )).flat();
}

async function verify(url, expected) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Preview HTTP${response.status}`);
  const html = await response.text();
  const deployments = [...new Set(html.match(/dpl_[A-Za-z0-9]+/g) ?? [])];
  if (deployments.length !== 1 || deployments[0] !== expected) throw new Error('Unexpected preview deployment');
  if (!response.headers.get('x-robots-tag')?.includes('noindex')) throw new Error('Preview indexing guard missing');
  if (!html.includes('G-XTQTZ6YCMG')) throw new Error('Expected analytics initialization missing');
  return { deployment: deployments[0], checkedAt: new Date().toISOString(), noindex: true };
}

async function run() {
  const out = resolve('outputs/directory-comparison');
  mkdirSync(out, { recursive: true });
  const results = [];
  let failed = false;
  for (const item of comparisonSchedule()) {
    const target = PREVIEWS[item.profile];
    const url = `${target.origin}/practice-areas/${item.slug}`;
    const path = resolve(out, `${item.round}-${item.slug}-${item.profile}`);
    const record = { ...item, url };
    results.push(record);
    try {
      record.before = await verify(url, target.deployment);
      writeFileSync(`${path}.config.mjs`, `export default ${JSON.stringify(config('baseline'), null, 2)};\n`);
      const result = spawnSync('lighthouse', [url,
        `--config-path=${path}.config.mjs`, '--chrome-flags=--headless',
        '--output=json', '--output=html', `--output-path=${path}`, '--save-assets', '--quiet',
      ], { encoding: 'utf8', timeout: 150000, maxBuffer: 4 * 1024 * 1024 });
      writeFileSync(`${path}.log`, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
      if (result.error || result.status !== 0) throw new Error(result.error?.message ?? `Lighthouse exit ${result.status}`);
      const lhr = JSON.parse(readFileSync(`${path}.report.json`, 'utf8'));
      Object.assign(record, summarize(lhr));
      record.benchmark = lhr.environment.benchmarkIndex;
      record.services = lhr.audits['network-requests'].details.items
        .filter(r => /googletagmanager\.com|posthog\.com/.test(r.url))
        .map(r => ({ host: new URL(r.url).hostname, status: r.statusCode, transferSize: r.transferSize }));
      if (record.runtimeError || record.url !== url || record.performance == null) throw new Error('Invalid Lighthouse result');
    } catch (error) {
      record.error = error.message;
      failed = true;
    } finally {
      if (record.before) {
        try { record.after = await verify(url, target.deployment); }
        catch (error) { record.afterError = error.message; failed = true; }
      }
    }
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ previews: PREVIEWS, results }, null, 2));
    console.log(JSON.stringify(record));
    if (!record.before || !record.after) break;
  }
  if (failed || results.length !== 18) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
