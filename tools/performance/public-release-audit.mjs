// Fixed public production measurement. No credentials, forms, service blocking,
// account changes or deployment commands. All failures and low scores retained.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const ORIGIN = 'https://www.mmg-lawfirm.com';
export const DEPLOYMENT = 'dpl_DVjoAvHi6jnVez8bzNnqC6mnYaru';
export const COMMIT = 'b55234f1e31699955e452352a600f1da0354f0fd';
export const SLUGS = ['car-accidents', 'truck-accidents', 'motorcycle-accidents'];
export function schedule() {
  return Array.from({length:3}, (_,round) => SLUGS.map((_,offset) => ({round:round+1, slug:SLUGS[(round+offset)%3]}))).flat();
}
export function config() {
  return {extends:'lighthouse:default',settings:{formFactor:'mobile',throttlingMethod:'devtools',onlyCategories:['performance','accessibility','best-practices','seo'],blockedUrlPatterns:[]}};
}
export function target(slug) {
  if (!SLUGS.includes(slug)) throw Error('Unapproved route');
  return `${ORIGIN}/practice-areas/${slug}`;
}
export function fingerprint(html, headers, slug) {
  const url = target(slug);
  const ids = [...new Set(html.match(/dpl_[A-Za-z0-9]+/g) ?? [])];
  if (ids.length!==1 || ids[0]!==DEPLOYMENT) throw Error('Production identity changed');
  if (/noindex|none/i.test(headers.get('x-robots-tag') ?? '') || /<meta[^>]+name="(?:robots|googlebot)"[^>]+content="[^"]*(?:noindex|none)/i.test(html)) throw Error('Production noindex');
  if (!html.includes('G-XTQTZ6YCMG')) throw Error('Expected analytics missing');
  const canonical=html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if(canonical!==url) throw Error('Canonical changed');
  const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if(!main) throw Error('Main content absent');
  const text=main.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return {deployment:ids[0],canonical,title:html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1],description:html.match(/<meta name="description" content="([^"]*)"/)?.[1],textHash:createHash('sha256').update(text).digest('hex'),csp:headers.get('content-security-policy')};
}
export function summarize(report) {
  const requests=report.audits['network-requests']?.details?.items ?? [];
  const lcp=report.audits['lcp-breakdown-insight']?.details?.items?.find(x=>x.type==='table')?.items ?? [];
  return {url:report.finalDisplayedUrl,version:report.lighthouseVersion,fetchTime:report.fetchTime,browser:report.environment?.hostUserAgent,benchmark:report.environment?.benchmarkIndex,
    scores:Object.fromEntries(Object.entries(report.categories).map(([k,v])=>[k,v.score==null?null:Math.round(v.score*100)])),
    lcp:report.audits['largest-contentful-paint']?.numericValue,tbt:report.audits['total-blocking-time']?.numericValue,cls:report.audits['cumulative-layout-shift']?.numericValue,
    lcpBreakdown:lcp,throttlingMethod:report.configSettings.throttlingMethod,throttling:report.configSettings.throttling,runtimeError:report.runtimeError ?? null,
    services:requests.filter(r=>/googletagmanager\.com|posthog\.com|sentry\.io|cloudflare\.com/.test(new URL(r.url).hostname)).map(r=>({host:new URL(r.url).hostname,status:r.statusCode,bytes:r.transferSize,type:r.resourceType})),
    totalTransfer:requests.reduce((sum,r)=>sum+(r.transferSize||0),0),scriptTransfer:requests.filter(r=>r.resourceType==='Script').reduce((sum,r)=>sum+(r.transferSize||0),0)};
}
async function verify(slug) {
  const r=await fetch(target(slug),{redirect:'error',signal:AbortSignal.timeout(30000)});
  if(r.status!==200) throw Error(`Public HTTP${r.status}`);
  return fingerprint(await r.text(),r.headers,slug);
}
async function run() {
  const out=resolve('outputs/public-release-139');
  mkdirSync(resolve('outputs'),{recursive:true});
  mkdirSync(out); // Refuse to overwrite an earlier measurement.
  const rows=[];let failed=false;
  for(const item of schedule()) {
    const prefix=resolve(out,`${item.round}-${item.slug}`),url=target(item.slug),row={...item};rows.push(row);
    try {
      row.before=await verify(item.slug);
      writeFileSync(`${prefix}.config.mjs`,`export default ${JSON.stringify(config())};\n`,{flag:'wx'});
      const exec=spawnSync('lighthouse',[url,`--config-path=${prefix}.config.mjs`,'--chrome-flags=--headless','--output=json','--output=html',`--output-path=${prefix}`,'--save-assets','--quiet'],{encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024});
      writeFileSync(`${prefix}.log`,`${exec.stdout ?? ''}\n${exec.stderr ?? ''}`,{flag:'wx'});
      if(exec.error || exec.status!==0) throw Error(exec.error?.message ?? `Lighthouse exit ${exec.status}`);
      Object.assign(row,summarize(JSON.parse(readFileSync(`${prefix}.report.json`,'utf8'))));
      if(row.runtimeError || row.url!==url || row.version!=='13.5.0' || row.throttlingMethod!=='devtools' || row.scores.performance==null) throw Error('Invalid measurement');
      if(!row.services.some(x=>x.host==='www.googletagmanager.com'&&x.status===200)) throw Error('Google script missing');
      if(!row.services.some(x=>x.host.endsWith('.posthog.com')&&x.status===200)) throw Error('PostHog missing');
    } catch(e) {row.error=e.message;failed=true;}
    finally {
      if(row.before) try {row.after=await verify(item.slug);if(JSON.stringify(row.after)!==JSON.stringify(row.before))throw Error('Concurrent public-page change');}
      catch(e){row.afterError=e.message;failed=true;}
    }
    const allNineMeet90=rows.length===9&&rows.every(r=>!r.error&&!r.afterError&&r.scores?.performance>=90);
    writeFileSync(resolve(out,'summary.json'),JSON.stringify({checkedAt:new Date().toISOString(),deployment:DEPLOYMENT,commit:COMMIT,method:'Applied mobile throttling, all services, rotated order, no submissions; not comparable with CI simulated scores.',allNineMeet90,rows},null,2));
    console.log(JSON.stringify({round:row.round,slug:row.slug,scores:row.scores,lcp:row.lcp,tbt:row.tbt,cls:row.cls,error:row.error,afterError:row.afterError}));
    if(!row.before || !row.after || row.afterError)break;
  }
  if(failed || rows.length!==9)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await run();
