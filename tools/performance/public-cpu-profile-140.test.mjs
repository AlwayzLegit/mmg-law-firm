import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEPLOYMENT,SLUGS,schedule,config,target,fingerprint,summarize,sampleCount} from './public-cpu-profile-140.mjs';
const headers=new Headers({'content-security-policy':"default-src 'self'"});
const html=`<html data-dpl-id="${DEPLOYMENT}"><title>Frozen title</title><meta name="description" content="Frozen description"><link rel="canonical" href="${target('car-accidents')}"><main><h1>Original body</h1></main><script>G-XTQTZ6YCMG</script></html>`;
test('three fixed profiling loads with services unblocked',()=>{
  assert.equal(schedule().length,3);for(const slug of SLUGS)assert.equal(schedule().filter(x=>x.slug===slug).length,1);
  assert.deepEqual(schedule().map(x=>x.slug),SLUGS);
  assert.equal(config().settings.additionalTraceCategories,'disabled-by-default-v8.cpu_profiler');
  assert.deepEqual(config().settings.blockedUrlPatterns,[]);assert.equal(config().settings.throttlingMethod,'devtools');assert.equal(config().settings.extraHeaders,undefined);
});
test('fixed route allowlist rejects arbitrary targets',()=>{
  for(const value of ['contact','https://other.example','../admin',undefined])assert.throws(()=>target(value));
});
test('public metadata and content fingerprint retains invariants',()=>{
  const r=fingerprint(html,headers,'car-accidents');assert.equal(r.title,'Frozen title');assert.equal(r.description,'Frozen description');assert.equal(r.deployment,DEPLOYMENT);
  assert.notEqual(fingerprint(html.replace('Original body','Changed body'),headers,'car-accidents').textHash,r.textHash);
});
test('identity, canonical, noindex and missing-content changes fail closed',()=>{
  for(const altered of [html.replace(DEPLOYMENT,'dpl_wrong'),html.replace('G-XTQTZ6YCMG','other'),html.replace('/car-accidents','/truck-accidents'),html.replace('<main>','<aside>'),html.replace('<title>','<meta name="robots" content="noindex"><title>')])assert.throws(()=>fingerprint(altered,headers,'car-accidents'));
  assert.throws(()=>fingerprint(html,new Headers({'x-robots-tag':'noindex'}),'car-accidents'));
});
test('service summary never retains URL queries or identifiers',()=>{
  const r=summarize({audits:{'network-requests':{details:{items:[{url:'https://analytics.posthog.com/e?private=redacted',statusCode:200,transferSize:20,resourceType:'Fetch'}]}}},configSettings:{throttlingMethod:'devtools'},categories:{performance:{score:.71}}});
  assert.equal(r.scores.performance,71);assert.equal(r.services[0].host,'analytics.posthog.com');assert.ok(!JSON.stringify(r).includes('private'));assert.ok(!JSON.stringify(r).includes('redacted'));
});
test('runner has no submission, credential, service-blocking or deployment action',()=>{
  const source=readFileSync(new URL('./public-cpu-profile-140.mjs',import.meta.url),'utf8');
  assert.ok(!/process\.env|--extra-headers|POST|api\/leads|gtag\(/.test(source));assert.ok(source.includes("mkdirSync(out)"));assert.ok(source.includes("row.after=await verify"));
});
test('manual audit job contains no application secrets and leaves normal Lighthouse in its own job',()=>{
  const workflow=readFileSync(new URL('../../.github/workflows/lighthouse.yml',import.meta.url),'utf8');
  const [normal,audit]=workflow.split('  public-cpu-profile:');
  assert.ok(normal.includes('uses: treosh/lighthouse-ci-action@v12'));assert.ok(normal.includes("inputs.target == 'local'"));
  assert.ok(audit.includes("inputs.target == 'public-profile-140'"));assert.ok(!/secrets\.|matrix\.|pnpm build|temporaryPublicStorage/.test(audit));
  assert.ok(audit.includes('persist-credentials: false'));assert.ok(audit.includes('contents: read'));
});


test('missing CPU samples never count as a captured profile',()=>{
  assert.equal(sampleCount({traceEvents:[]}),0);
  assert.equal(sampleCount({traceEvents:[{name:'ProfileChunk',args:{data:{cpuProfile:{samples:[1,2,3]}}}}]}),3);
});
