/** Alternate measurement only. No production edits, authentication or service blocking. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config, summarize, EXPECTED_DEPLOYMENT } from './live-diagnostic.mjs';

export const ORIGIN = 'https://www.mmg-lawfirm.com';
export const ROUTES = ['car-accidents', 'truck-accidents', 'motorcycle-accidents'];
export function appliedSchedule() {
  return Array.from({ length: 3 }, (_, round) => ROUTES.map((_, offset) => ({
    round: round + 1, slug: ROUTES[(round + offset) % ROUTES.length],
  }))).flat();
}
export function appliedConfig() {
  const base = config('baseline');
  return { ...base, settings: { ...base.settings, throttlingMethod: 'devtools' } };
}
async function verify(url) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public page HTTP${response.status}`);
  const html = await response.text();
  const ids = [...new Set(html.match(/dpl_[A-Za-z0-9]+/g) ?? [])];
  if (ids.length !== 1 || ids[0] !== EXPECTED_DEPLOYMENT) throw new Error('Production deployment changed');
  if (!html.includes('G-XTQTZ6YCMG')) throw new Error('Expected analytics initialization absent');
  if (response.headers.get('x-robots-tag')?.includes('noindex')) throw new Error('Unexpected public noindex');
  return { deployment: ids[0], checkedAt: new Date().toISOString() };
}
async function run() {
  const out = resolve('outputs/applied-throttling');
  mkdirSync(out,{ recursive: true });
  const results = [];
  let failed = false;
  for (const item of appliedSchedule()) {
    const url = `${ORIGIN}/practice-areas/${item.slug}`;
    const prefix = resolve(out,`${item.round}-${item.slug}`);
    const record = { ...item, url };
    results.push(record);
    try {
      record.before = await verify(url);
      writeFileSync(`${prefix}.config.mjs`, `export default ${JSON.stringify(appliedConfig(),null,2)};\n`);
      const processResult = spawnSync('lighthouse',[url,`--config-path=${prefix}.config.mjs`,
        '--chrome-flags=--headless','--output=json','--output=html',`--output-path=${prefix}`,
        '--save-assets','--quiet'],{encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});
      writeFileSync(`${prefix}.log`,`${processResult.stdout ?? ''}\n${processResult.stderr ?? ''}`);
      if (processResult.error || processResult.status !== 0) throw new Error(processResult.error?.message ?? `Lighthouse exit ${processResult.status}`);
      const report = JSON.parse(readFileSync(`${prefix}.report.json`,'utf8'));
      Object.assign(record,summarize(report));
      record.benchmark = report.environment.benchmarkIndex;
      record.throttlingMethod = report.configSettings.throttlingMethod;
      record.throttling = report.configSettings.throttling;
      record.observed = report.audits.metrics.details.items[0];
      record.services = report.audits['network-requests'].details.items
        .filter(r=>/googletagmanager\.com|posthog\.com/.test(r.url))
        .map(r=>({host:new URL(r.url).hostname,status:r.statusCode,transferSize:r.transferSize}));
      if (record.runtimeError || record.url !== url || record.performance == null || record.throttlingMethod !== 'devtools') throw new Error('Invalid alternate-method result');
    } catch(error) {
      record.error=error.message;
      failed=true;
    } finally {
      if (record.before) {
        try { record.after=await verify(url); }
        catch(error) { record.afterError=error.message; failed=true; }
      }
    }
    writeFileSync(resolve(out,'summary.json'),JSON.stringify({expectedDeployment:EXPECTED_DEPLOYMENT,
      note:'Alternate applied-throttling method; do not replace, blend with or discard earlier simulated results.',results},null,2));
    console.log(JSON.stringify(record));
    if (!record.before || !record.after) break;
  }
  if (failed || results.length!==9) process.exitCode=1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
