// Run with: node --test scripts/health/monitor/monitor.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FORM_MARKERS } from "../checks.mjs";
import { alertsConfigured, composeAlert, sendAlert } from "./alert.mjs";
import { RETRY_WAIT_MS, handleFetch, runChecksTwice, runRound } from "./handler.mjs";
import { STATUS_URL, alertFor, fileAlert } from "./inbox.mjs";
import { HOUR_MS, MAX_KEPT, REMINDER_MS, nextRound, nextRows, quietHours, quietUntilMs } from "./round.mjs";
import { STATUS_MAX_AGE_MS, publicStatus, words } from "./status.mjs";

const SITE = "https://www.mmg-lawfirm.com";
const FORM = FORM_MARKERS.join(" ");
const SCRIPT = "/_next/static/chunks/abc.js";
const T0 = Date.parse("2026-11-16T12:00:00Z");
const PASS = { ok: true, lines: ["home: ok", "health: OK"], failure: null };
const FAIL = { ok: false, lines: [], failure: "/contact: status 500" };

function goodRoutes() {
  return {
    "/": { text: "<title>MMG Law Firm</title>" },
    "/contact": { text: `<html>${FORM}<script src="${SCRIPT}"></script></html>` },
    "/contact?_rsc=health": { text: `<html>${FORM}</html>` },
    [SCRIPT]: { text: "console.log(1)" },
    "/practice-areas/car-accidents": { text: "<h1>California Car Accident Lawyer</h1>" },
    "/api/health": { text: JSON.stringify({ ok: true, status: "healthy" }) },
  };
}

function stubFetch(routes) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    sent.push({ url, method: init.method });
    const r = routes[url.replace(SITE, "")];
    if (!r) return new Response("not found", { status: 404 });
    return new Response(r.text, { status: r.status ?? 200 });
  };
  return { sent, fetchImpl };
}

// A stand-in for the Durable Object binding: one stored value.
function fakeEnv(extra = {}) {
  let stored = null;
  const obj = { get: async () => stored, put: async (v) => { stored = structuredClone(v); } };
  return {
    env: { SITE_URL: SITE, QUIET_HOURS: "24", MONITOR_STATE: { idFromName: (n) => n, get: () => obj }, ...extra },
    peek: () => stored,
    poke: (v) => { stored = v; },
  };
}

const MAIL = { ALERT_EMAIL: "x@example.invalid", RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@example.invalid" };

// ------------------------------------------------------------------ rounds

test("quietHours: 24 for a missing, empty, broken or small value, never above 720", () => {
  for (const v of [undefined, null, "", "  ", "abc", "-5", "0", "23", "NaN", "Infinity", "1e999x", {}, []]) assert.equal(quietHours(v), 24, String(v));
  assert.equal(quietHours("24"), 24);
  assert.equal(quietHours(48), 48);
  assert.equal(quietHours("100.5"), 100.5);
  assert.equal(quietHours("721"), 720);
  assert.equal(quietHours("1e9"), 720);
});

test("the quiet time counts from the first stored round, not from a date in the config", () => {
  const first = nextRound(null, PASS, T0, "24");
  assert.equal(first.state.firstRoundAt, T0);
  assert.equal(quietUntilMs(T0, "24"), T0 + 24 * HOUR_MS);
  // The stored first round never moves.
  const later = nextRound(first.state, PASS, T0 + 5 * HOUR_MS, "24");
  assert.equal(later.state.firstRoundAt, T0);
});

test("a failed round in the quiet time goes to wouldHaveRaised and opens nothing", () => {
  let st = nextRound(null, PASS, T0, "24").state;
  const r = nextRound(st, FAIL, T0 + HOUR_MS, "24");
  assert.equal(r.events.length, 0);
  assert.equal(r.state.open, null);
  assert.deepEqual(r.state.incidents, []);
  assert.equal(r.state.wouldHaveRaised.length, 1);
  assert.equal(r.state.wouldHaveRaised[0].reason, FAIL.failure);
  assert.equal(r.state.ok, false);
  assert.equal(r.state.streak, 1);
  const r2 = nextRound(r.state, FAIL, T0 + 2 * HOUR_MS, "24");
  assert.equal(r2.state.streak, 2);
  assert.equal(r2.state.since, T0 + HOUR_MS);
});

test("after the quiet time an incident opens, a reminder follows an hour later, then one recovery", () => {
  const start = T0 + 25 * HOUR_MS;
  let st = nextRound(null, PASS, T0, "24").state;
  let r = nextRound(st, FAIL, start, "24");
  assert.deepEqual(r.events.map((e) => e.type), ["start"]);
  assert.equal(r.state.open.rounds, 1);
  r = nextRound(r.state, FAIL, start + 15 * 60 * 1000, "24");
  assert.equal(r.events.length, 0);
  assert.equal(r.state.open.rounds, 2);
  r = nextRound(r.state, FAIL, start + REMINDER_MS, "24");
  assert.deepEqual(r.events.map((e) => e.type), ["reminder"]);
  r = nextRound(r.state, FAIL, start + REMINDER_MS + 10 * 60 * 1000, "24");
  assert.equal(r.events.length, 0);
  r = nextRound(r.state, PASS, start + REMINDER_MS + 20 * 60 * 1000, "24");
  assert.deepEqual(r.events.map((e) => e.type), ["recovery"]);
  assert.equal(r.state.open, null);
  assert.equal(r.state.incidents.length, 1);
  assert.equal(r.state.incidents[0].rounds, 4);
  r = nextRound(r.state, PASS, start + 2 * REMINDER_MS, "24");
  assert.equal(r.events.length, 0);
});

test("the lists keep the last 20 and survive a broken stored state", () => {
  let st = nextRound(null, PASS, T0, "24").state;
  for (let i = 1; i <= 30; i++) st = nextRound(st, FAIL, T0 + i * 60 * 1000, "24").state;
  assert.equal(st.wouldHaveRaised.length, MAX_KEPT);
  for (const bad of [undefined, null, 5, "x", [], { incidents: "no", wouldHaveRaised: 3, open: 7, streak: "x", firstRoundAt: "soon" }]) {
    assert.doesNotThrow(() => nextRound(bad, FAIL, T0, "24"), String(bad));
    assert.doesNotThrow(() => nextRound(bad, PASS, T0, undefined), String(bad));
  }
});

// ----------------------------------------------------------------- checks

test("a round passes against good pages and sends only GET requests to SITE_URL", async () => {
  const { sent, fetchImpl } = stubFetch(goodRoutes());
  const r = await runChecksTwice({ SITE_URL: SITE }, { fetchImpl, sleep: async () => {} });
  assert.equal(r.ok, true);
  assert.equal(r.lines.at(-1), "health: OK");
  assert.ok(sent.length >= 6);
  for (const s of sent) {
    assert.equal(s.method, "GET");
    assert.ok(s.url.startsWith(`${SITE}/`), s.url);
    assert.ok(!s.url.includes("/api/leads"));
  }
});

test("a failed check is tried once more after 30 seconds, and a second failure counts", async () => {
  const bad = goodRoutes();
  bad["/practice-areas/car-accidents"] = { text: "oops", status: 500 };
  const waits = [];
  const { fetchImpl } = stubFetch(bad);
  const r = await runChecksTwice({ SITE_URL: SITE }, { fetchImpl, sleep: async (ms) => { waits.push(ms); } });
  assert.equal(r.ok, false);
  assert.deepEqual(waits, [RETRY_WAIT_MS]);
  assert.match(r.failure, /^\/practice-areas\/car-accidents: status 500$/);
  // A first failure that passes on the second try is a passing round.
  let n = 0;
  const flaky = async (url, init) => {
    if (url === `${SITE}/` && n++ === 0) return new Response("x", { status: 502 });
    return stubFetch(goodRoutes()).fetchImpl(url, init);
  };
  const ok = await runChecksTwice({ SITE_URL: SITE }, { fetchImpl: flaky, sleep: async () => {} });
  assert.equal(ok.ok, true);
});

test("an error that is not a CheckFailed is a failed round with the fixed reason probe error", async () => {
  const r = await runChecksTwice({ SITE_URL: SITE }, { fetchImpl: async () => new Response("x", { status: 200 }), sleep: async () => {}, now: () => { throw new Error("boom"); } });
  assert.deepEqual(r, { ok: false, lines: [], failure: "probe error" });
});

// ----------------------------------------------------------------- alerts

test("alerts need all three settings and say so in the log without an address", async () => {
  for (const missing of ["ALERT_EMAIL", "RESEND_API_KEY", "RESEND_FROM_EMAIL"]) {
    const env = { ...MAIL, SITE_URL: SITE, [missing]: undefined };
    assert.equal(alertsConfigured(env), false, missing);
    const calls = [];
    const logs = [];
    const out = await sendAlert(env, { type: "start", reason: "x" }, async (...a) => { calls.push(a); return new Response("ok"); }, (l) => logs.push(l));
    assert.equal(out, "skipped");
    assert.equal(calls.length, 0, "no mail call");
    assert.equal(logs.length, 1);
    assert.ok(!logs[0].includes("@"));
  }
});

test("a configured alert posts once to the provider, a failure never throws or logs a secret", async () => {
  const env = { ...MAIL, SITE_URL: SITE };
  let seen;
  assert.equal(await sendAlert(env, { type: "start", reason: "/contact: status 500" }, async (url, init) => { seen = { url, init }; return new Response("{}", { status: 200 }); }, () => {}), "sent");
  assert.equal(seen.url, "https://api.resend.com/emails");
  const body = JSON.parse(seen.init.body);
  assert.match(body.subject, /DOWN/);
  assert.deepEqual(body.to, [MAIL.ALERT_EMAIL]);
  const logs = [];
  assert.equal(await sendAlert(env, { type: "recovery" }, async () => new Response("no", { status: 401 }), (l) => logs.push(l)), "failed");
  assert.equal(await sendAlert(env, { type: "recovery" }, async () => { throw new Error("net"); }, (l) => logs.push(l)), "failed");
  for (const l of logs) assert.ok(!l.includes(MAIL.RESEND_API_KEY) && !l.includes("@"), l);
  assert.match(composeAlert({ type: "reminder", reason: "r" }, SITE).subject, /still failing/);
  assert.match(composeAlert({ type: "recovery" }, SITE).subject, /recovered/);
});

test("a round in the quiet time sends no mail, after it one mail goes out for the start and one for the recovery", async () => {
  const { env, peek } = fakeEnv(MAIL);
  const bad = goodRoutes();
  bad["/"] = { text: "x", status: 500 };
  const mails = [];
  const alertFetch = async (url, init) => { mails.push(JSON.parse(init.body).subject); return new Response("{}"); };
  const failing = stubFetch(bad).fetchImpl;
  const passing = stubFetch(goodRoutes()).fetchImpl;
  const run = (fetchImpl, at) => runRound(env, { now: at, fetchImpl, alertFetch, sleep: async () => {}, log: () => {} });
  await run(passing, T0);
  await run(failing, T0 + HOUR_MS);
  assert.equal(mails.length, 0);
  assert.equal(peek().wouldHaveRaised.length, 1);
  await run(failing, T0 + 25 * HOUR_MS);
  assert.equal(mails.length, 1);
  assert.match(mails[0], /DOWN/);
  await run(passing, T0 + 26 * HOUR_MS);
  assert.equal(mails.length, 2);
  assert.match(mails[1], /recovered/);
  assert.equal(peek().incidents.length, 1);
});

// -------------------------------------------------------------- Inbox rows (OPS-352)

// A stand-in for the CREW_INTAKE service binding: records each createAlert call.
function fakeIntake(answer = async () => ({ ok: true, pageId: "p" })) {
  const calls = [];
  return { calls, binding: { createAlert: async (alert) => { calls.push(structuredClone(alert)); return answer(alert); } } };
}

const failingFetch = () => { const bad = goodRoutes(); bad["/"] = { text: "x", status: 500 }; return stubFetch(bad).fetchImpl; };
const passingFetch = () => stubFetch(goodRoutes()).fetchImpl;

test("alertFor builds fixed words and ISO times, and only a recovery has a to", () => {
  const start = alertFor({ type: "start", reason: "/contact: status 500", from: T0 }, {});
  assert.deepEqual(start, { kind: "start", check: "/contact: status 500", from: new Date(T0).toISOString(), to: null, statusUrl: STATUS_URL, rehearsal: false });
  const back = alertFor({ type: "recovery", reason: "<b>x</b> a@b.co", from: T0, to: T0 + HOUR_MS }, { REHEARSAL: "1" });
  assert.equal(back.check, "bx/b ab.co");
  assert.equal(back.to, new Date(T0 + HOUR_MS).toISOString());
  assert.equal(back.rehearsal, true);
  assert.equal(alertFor({ type: "start", reason: "", from: T0 }, {}).check, "check failed");
  assert.deepEqual(Object.keys(start).sort(), ["check", "from", "kind", "rehearsal", "statusUrl", "to"]);
});

test("fileAlert: no binding is not bound; a refusal and a throw are logged with no address or body and never throw", async () => {
  const logs = [];
  const event = { type: "start", reason: "r", from: T0 };
  assert.equal(await fileAlert({}, event, (l) => logs.push(l)), "not bound");
  const refused = fakeIntake(async () => ({ ok: false, reason: "rate limited" }));
  assert.equal(await fileAlert({ CREW_INTAKE: refused.binding }, event, (l) => logs.push(l)), "refused");
  const thrown = { createAlert: async () => { throw new Error("https://secret.example/body?token=abc"); } };
  assert.equal(await fileAlert({ CREW_INTAKE: thrown }, event, (l) => logs.push(l)), "failed");
  assert.deepEqual(logs, ["monitor: inbox alert refused rate limited", "monitor: inbox alert failed"]);
  for (const l of logs) assert.ok(!l.includes("secret") && !l.includes("token") && !l.includes("http"), l);
});

test("nextRows: the row path is quiet for 24 hours from the first bound round and keeps what it would have filed", () => {
  const ev = [{ type: "start", reason: "r", from: T0 }];
  const a = nextRows(undefined, { bound: false, events: ev, now: T0 });
  assert.deepEqual(a, { rows: { rowsFrom: null, filed: 0, lastResult: null, wouldHaveFiled: [] }, toFile: [] });
  const b = nextRows(a.rows, { bound: true, events: [], now: T0 });
  assert.equal(b.rows.rowsFrom, T0);
  const c = nextRows(b.rows, { bound: true, events: ev, now: T0 + HOUR_MS });
  assert.deepEqual(c.toFile, []);
  assert.deepEqual(c.rows.wouldHaveFiled, [{ at: T0 + HOUR_MS, kind: "start" }]);
  const d = nextRows(c.rows, { bound: true, events: ev, now: T0 + 24 * HOUR_MS });
  assert.deepEqual(d.toFile, ev);
  assert.equal(d.rows.rowsFrom, T0);
  // not bound files nothing, even long after
  assert.deepEqual(nextRows(undefined, { bound: false, events: ev, now: T0 + 99 * HOUR_MS }).toFile, []);
  // broken stored records never throw
  for (const bad of [null, 5, "x", [], { rowsFrom: "x", filed: -3, wouldHaveFiled: 7, lastResult: 9 }]) nextRows(bad, { bound: true, events: ev, now: T0 });
  // the list keeps the last 20
  let rows = b.rows;
  for (let i = 0; i < 25; i++) rows = nextRows(rows, { bound: true, events: ev, now: T0 + i * 1000 }).rows;
  assert.equal(rows.wouldHaveFiled.length, MAX_KEPT);
});

test("start, reminder and recovery each call the binding once with fixed words; the quiet times call nothing", async () => {
  const { env, peek } = fakeEnv();
  const intake = fakeIntake();
  env.CREW_INTAKE = intake.binding;
  const run = (fetchImpl, at) => runRound(env, { now: at, fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: () => {} });
  await run(passingFetch(), T0); // first round: both quiets start
  await run(failingFetch(), T0 + HOUR_MS); // inside both quiets
  assert.equal(intake.calls.length, 0);
  assert.equal(peek().rows.wouldHaveFiled.length, 0); // no event in the site's own quiet either
  await run(failingFetch(), T0 + 25 * HOUR_MS); // start
  assert.equal(intake.calls.length, 1);
  assert.equal(intake.calls[0].kind, "start");
  assert.equal(intake.calls[0].from, new Date(T0 + 25 * HOUR_MS).toISOString());
  assert.equal(intake.calls[0].to, null);
  await run(failingFetch(), T0 + 25 * HOUR_MS + 15 * 60_000); // still failing, under an hour: nothing
  assert.equal(intake.calls.length, 1);
  await run(failingFetch(), T0 + 26 * HOUR_MS + 1000); // reminder
  assert.equal(intake.calls.length, 2);
  assert.equal(intake.calls[1].kind, "reminder");
  await run(passingFetch(), T0 + 27 * HOUR_MS); // recovery
  assert.equal(intake.calls.length, 3);
  assert.equal(intake.calls[2].kind, "recovery");
  assert.equal(intake.calls[2].to, new Date(T0 + 27 * HOUR_MS).toISOString());
  assert.equal(peek().rows.filed, 3);
  assert.equal(peek().rows.lastResult, "filed");
  for (const c of intake.calls) assert.deepEqual(Object.keys(c).sort(), ["check", "from", "kind", "rehearsal", "statusUrl", "to"]);
});

test("the row path's own quiet holds even after the site's quiet is over, and fills wouldHaveFiled", async () => {
  const { env, peek, poke } = fakeEnv();
  const intake = fakeIntake();
  // The monitor ran for days before the binding was added.
  poke(nextRound(null, PASS, T0, "24").state);
  env.CREW_INTAKE = intake.binding;
  const run = (fetchImpl, at) => runRound(env, { now: at, fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: () => {} });
  await run(failingFetch(), T0 + 100 * HOUR_MS); // site quiet over, row quiet just started
  assert.equal(intake.calls.length, 0);
  assert.deepEqual(peek().rows.wouldHaveFiled, [{ at: T0 + 100 * HOUR_MS, kind: "start" }]);
  const status = await (await handleFetch(new Request("https://m.example/status"), env, T0 + 100 * HOUR_MS + 1000)).json();
  assert.equal(status.rowAlerts.state, "quiet");
  assert.equal(status.rowAlerts.quietUntil, new Date(T0 + 124 * HOUR_MS).toISOString());
  assert.deepEqual(status.wouldHaveFiled, [{ at: new Date(T0 + 100 * HOUR_MS).toISOString(), kind: "start" }]);
  assert.equal(status.alerts, "not configured");
  await run(passingFetch(), T0 + 125 * HOUR_MS); // after the row quiet: the recovery is filed
  assert.equal(intake.calls.length, 1);
  assert.equal(intake.calls[0].kind, "recovery");
  const after = await (await handleFetch(new Request("https://m.example/status"), env, T0 + 125 * HOUR_MS + 1000)).json();
  assert.equal(after.rowAlerts.state, "on");
  assert.equal(after.rowAlerts.filed, 1);
});

test("a binding that throws or refuses is logged with no address or body and the round still stores its state", async () => {
  for (const binding of [
    { createAlert: async () => { throw new Error("https://leak.example/?k=1"); } },
    { createAlert: async () => ({ ok: false, reason: "rate limited" }) },
  ]) {
    const { env, peek } = fakeEnv();
    env.CREW_INTAKE = binding;
    const logs = [];
    const run = (fetchImpl, at) => runRound(env, { now: at, fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: (l) => logs.push(l) });
    await run(passingFetch(), T0);
    await run(failingFetch(), T0 + 25 * HOUR_MS);
    assert.equal(peek().ok, false);
    assert.equal(peek().open.reason, "/: status 500");
    assert.equal(peek().rows.filed, 0);
    assert.ok(["failed", "refused"].includes(peek().rows.lastResult));
    for (const l of logs) assert.ok(!l.includes("leak") && !l.includes("http"), l);
  }
});

test("no binding: the row path says not bound, files nothing and /status keeps alerts not configured", async () => {
  const { env, peek } = fakeEnv();
  const run = (fetchImpl, at) => runRound(env, { now: at, fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: () => {} });
  await run(passingFetch(), T0);
  await run(failingFetch(), T0 + 25 * HOUR_MS);
  assert.equal(peek().rows.filed, 0);
  const status = await (await handleFetch(new Request("https://m.example/status"), env, T0 + 25 * HOUR_MS + 1000)).json();
  assert.equal(status.rowAlerts.state, "not bound");
  assert.equal(status.alerts, "not configured");
});

test("REHEARSAL makes no request to the site, files exactly one row and never twice", async () => {
  const { env, peek } = fakeEnv({ REHEARSAL: "1" });
  const intake = fakeIntake();
  env.CREW_INTAKE = intake.binding;
  const sent = [];
  const fetchImpl = async (url) => { sent.push(url); return new Response("x"); };
  const run = (at) => runRound(env, { now: at, fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: () => {} });
  await run(T0);
  assert.equal(sent.length, 0);
  assert.equal(intake.calls.length, 1);
  assert.equal(intake.calls[0].kind, "start");
  assert.equal(intake.calls[0].check, "rehearsal: forced failure");
  assert.equal(intake.calls[0].rehearsal, true);
  assert.equal(peek().rows.filed, 1);
  for (let i = 1; i <= 12; i++) await run(T0 + i * 15 * 60_000);
  assert.equal(intake.calls.length, 1); // a reminder after an hour is not filed
  const status = await (await handleFetch(new Request("https://m.example/status"), env, T0 + 12 * 15 * 60_000 + 1000)).json();
  assert.equal(status.rowAlerts.state, "on");
  assert.equal(status.rowAlerts.filed, 1);
  assert.equal(status.rowAlerts.lastResult, "filed");
});

test("the real monitor never rehearses: without REHEARSAL it asks the site", async () => {
  const { env } = fakeEnv();
  const stub = stubFetch(goodRoutes());
  await runRound(env, { now: T0, fetchImpl: stub.fetchImpl, alertFetch: async () => new Response("{}"), sleep: async () => {}, log: () => {} });
  assert.ok(stub.sent.length > 0);
});

// ----------------------------------------------------------------- status

const FIELDS = ["alerts", "checkedAt", "failingSince", "firstRoundAt", "incidents", "lastFailure", "lines", "ok", "quietUntil", "rowAlerts", "streak", "v", "wouldHaveFiled", "wouldHaveRaised"];

test("/status holds only the fixed fields and never what the stored state adds", async () => {
  const { env, poke } = fakeEnv();
  const state = nextRound(null, PASS, T0, "24").state;
  poke({ ...state, secret: "SHOULD-NOT-LEAK", headers: { cookie: "x" }, lines: ["home: ok", "<script>alert(1)</script> body \u0000"], lastFailure: "/x: <b>html</b> sk_live_123" });
  const res = await handleFetch(new Request(`https://m.example/status`), env, T0 + 60_000);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
  const text = await res.text();
  assert.ok(!text.includes("SHOULD-NOT-LEAK") && !text.includes("<script>") && !text.includes("<b>"));
  const body = JSON.parse(text);
  assert.deepEqual(Object.keys(body).sort(), FIELDS);
  assert.equal(body.v, 1);
  assert.equal(body.ok, true);
  assert.equal(body.alerts, "not configured");
  assert.deepEqual(body.rowAlerts, { state: "not bound", quietUntil: null, filed: 0, lastResult: null });
  assert.deepEqual(body.wouldHaveFiled, []);
  assert.equal(body.firstRoundAt, new Date(T0).toISOString());
  assert.equal(body.quietUntil, new Date(T0 + 24 * HOUR_MS).toISOString());
});

test("/status answers 503 for an empty or stale state and 404 for everything else", async () => {
  const { env, poke } = fakeEnv();
  assert.equal((await handleFetch(new Request("https://m.example/status"), env, T0)).status, 503);
  poke(nextRound(null, PASS, T0, "24").state);
  assert.equal((await handleFetch(new Request("https://m.example/status"), env, T0 + STATUS_MAX_AGE_MS)).status, 200);
  const stale = await handleFetch(new Request("https://m.example/status"), env, T0 + STATUS_MAX_AGE_MS + 1);
  assert.equal(stale.status, 503);
  assert.equal((await stale.json()).ok, false);
  for (const [path, method] of [["/", "GET"], ["/status/x", "GET"], ["/__scheduled", "GET"], ["/status", "POST"]]) {
    assert.equal((await handleFetch(new Request(`https://m.example${path}`, { method }), env, T0)).status, 404, `${method} ${path}`);
  }
});

test("/status never throws for any QUIET_HOURS value or any stored state", async () => {
  const states = [null, undefined, 5, "x", [], {}, { checkedAt: T0 }, { checkedAt: T0, firstRoundAt: 1e300, incidents: [null, 3, { from: 1e300 }], wouldHaveRaised: ["x", { at: "no" }], lines: [1, null, {}], streak: "x" }, nextRound(null, FAIL, T0, "24").state];
  for (const hours of [undefined, null, "", "abc", "-1", "0", "24", "100", "720", "721", "1e9", "1e308", "Infinity", "NaN", "9".repeat(400)]) {
    for (const st of states) {
      const { env, poke } = fakeEnv({ QUIET_HOURS: hours });
      poke(st);
      const res = await handleFetch(new Request("https://m.example/status"), env, T0 + 60_000);
      assert.ok([200, 503].includes(res.status), `${hours} ${JSON.stringify(st)}`);
      JSON.parse(await res.text());
    }
  }
  // A first round far in the future cannot break the date either.
  const far = publicStatus({ checkedAt: T0, firstRoundAt: Number.MAX_SAFE_INTEGER, ok: true }, T0, { alertsConfigured: false, quietHours: "720" });
  assert.equal(far.body.quietUntil, null);
});

test("words keeps a path, fixed words and numbers and drops the rest", () => {
  assert.equal(words("/contact?_rsc=health: status 503 (failing: database)"), "/contact?_rsc=health: status 503 (failing: database)");
  assert.equal(words("<b>x</b>\n$ secret"), "bx/b secret");
  assert.ok(!words("a".repeat(500)).includes("a".repeat(161)));
  assert.equal(words(undefined), "");
});

// -------------------------------------------------------------- the files

test("checks.mjs holds no node: import, so the Workers runtime can load it", () => {
  const text = readFileSync(new URL("../checks.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(text, /from\s+["']node:/);
  assert.doesNotMatch(text, /require\(/);
  assert.doesNotMatch(text, /process\./);
});

test("the monitor config has a Durable Object with SQLite, the strict fetch flag and no staging block", () => {
  const text = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
  const json = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
  assert.equal(json.name, "mmg-law-firm-monitor");
  assert.ok(json.compatibility_flags.includes("global_fetch_strictly_public"));
  assert.deepEqual(json.migrations[0].new_sqlite_classes, ["MonitorState"]);
  assert.equal(json.durable_objects.bindings[0].name, "MONITOR_STATE");
  assert.deepEqual(json.triggers.crons, ["3,18,33,48 * * * *"]);
  assert.equal(json.env, undefined);
  assert.equal(json.vars.SITE_URL, SITE);
  assert.equal(json.vars.REHEARSAL, undefined);
});

test("the config binds crew-intake's MmgLawIntake as CREW_INTAKE and no secret or address", () => {
  const text = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
  const json = JSON.parse(text.replace(/^\s*\/\/.*$/gm, ""));
  assert.deepEqual(json.services, [{ binding: "CREW_INTAKE", service: "crew-intake", entrypoint: "MmgLawIntake" }]);
  assert.ok(!/token|secret|api\.notion/i.test(JSON.stringify(json.vars)));
});

test("monitor-deploy.yml: rehearsal is a hand input, off by default, with no pull request trigger and a deletion that always runs", () => {
  const text = readFileSync(new URL("../../../.github/workflows/monitor-deploy.yml", import.meta.url), "utf8");
  assert.match(text, /rehearse:\s*\n\s+description:[^\n]*\n\s+type: boolean\n\s+default: false/);
  assert.doesNotMatch(text, /pull_request/);
  assert.match(text, /if: \$\{\{ always\(\) && inputs\.rehearse \}\}/);
  assert.match(text, /rehearsal worker deleted/);
  assert.match(text, /rehearsal: row filed: /);
  assert.match(text, /--var REHEARSAL:1/);
  // the real deploy is skipped in a rehearsal
  assert.match(text, /name: Deploy the monitor\n\s+if: \$\{\{ !inputs\.rehearse \}\}/);
});
