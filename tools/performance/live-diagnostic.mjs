/**
 * Manual, diagnostic-only comparison. Never imports credentials or app env.
 * Blocking applies ONLY to fresh Lighthouse test browsers, not the live site.
 * The reduced-script controls are not production scores or release candidates.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const TARGET = 'https://www.mmg-lawfirm.com/practice-areas/car-accidents';
export const EXPECTED_DEPLOYMENT = 'dpl_2PVnV43GME8atoBasV2pfC9YVBFz';
export const PROFILES = Object.freeze({
  baseline: [],
  'without-ga-test-only': ['*://www.googletagmanager.com/*'],
  'without-posthog-test-only': ['*://*.posthog.com/*'],
});

export function schedule() {
  const names = Object.keys(PROFILES);
  return Array.from({ length: 3 }, (_, round) =>
    names.map((_, offset) => ({ round: round + 1, profile: names[(round + offset) % names.length] })),
  ).flat();
}

export function config(profile) {
  if (!Object.hasOwn(PROFILES, profile)) throw new Error('Unknown diagnostic profile');
  return {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      blockedUrlPatterns: PROFILES[profile],
    },
  };
}

export function summarize(lhr) {
  return {
    url: lhr.finalDisplayedUrl,
    version: lhr.lighthouseVersion,
    fetchedAt: lhr.fetchTime,
    performance: lhr.categories?.performance?.score == null ? null : Math.round(lhr.categories.performance.score * 100),
    seo: lhr.categories?.seo?.score == null ? null : Math.round(lhr.categories.seo.score * 100),
    lcp: lhr.audits?.['largest-contentful-paint']?.numericValue ?? null,
    tbt: lhr.audits?.['total-blocking-time']?.numericValue ?? null,
    cls: lhr.audits?.['cumulative-layout-shift']?.numericValue ?? null,
    runtimeError: lhr.runtimeError ?? null,
  };
}

async function verifyDeployment() {
  const response = await fetch(TARGET, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Live page returned ${response.status}`);
  const html = await response.text();
  const ids = [...new Set(html.match(/dpl_[A-Za-z0-9]+/g) ?? [])];
  if (ids.length !== 1 || ids[0] !== EXPECTED_DEPLOYMENT) {
    throw new Error(`Deployment changed or unverified: ${ids.join(',') || 'no identifier'}`);
  }
  return { checkedAt: new Date().toISOString(), deployment: ids[0], status: response.status };
}

export async function run() {
  const out = resolve('outputs/live-car-diagnostics');
  mkdirSync(out, { recursive: true });
  const results = [];
  let failed = false;
  for (const item of schedule()) {
    const prefix = `${item.round}-${item.profile}`;
    const path = resolve(out, prefix);
    const record = { ...item, diagnosticOnly: item.profile !== 'baseline' };
    results.push(record);
    try {
      record.before = await verifyDeployment();
      const configPath = `${path}.config.mjs`;
      writeFileSync(configPath, `export default ${JSON.stringify(config(item.profile), null, 2)};\n`);
      const result = spawnSync('lighthouse', [TARGET,
        `--config-path=${configPath}`, '--chrome-flags=--headless',
        '--output=json', '--output=html', `--output-path=${path}`,
        '--save-assets', '--quiet',
      ], { encoding: 'utf8', timeout: 150000, maxBuffer: 4 * 1024 * 1024 });
      writeFileSync(`${path}.log`, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
      if (result.error || result.status !== 0) throw new Error(result.error?.message ?? `Lighthouse exit ${result.status}`);
      Object.assign(record, summarize(JSON.parse(readFileSync(`${path}.report.json`, 'utf8'))));
      record.after = await verifyDeployment();
      if (record.runtimeError || record.url !== TARGET || record.performance == null) throw new Error('Invalid Lighthouse result');
    } catch (error) {
      record.error = error.message;
      failed = true;
    }
    writeFileSync(resolve(out, 'summary.json'), JSON.stringify({ target: TARGET, expectedDeployment: EXPECTED_DEPLOYMENT, results }, null, 2));
    console.log(JSON.stringify(record));
    // Never continue comparing different deployments or an unavailable site.
    if (!record.before || !record.after) break;
  }
  if (failed || results.length !== 9) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await run();
