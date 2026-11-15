// Run with: node --test scripts/health/monitor/monitor.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FORM_MARKERS } from "../checks.mjs";
import { alertsConfigured, composeAlert, sendAlert } from "./alert.mjs";
import { RETRY_WAIT_MS, handleFetch, runChecksTwice, runRound } from "./handler.mjs";
import { HOUR_MS, MAX_KEPT, REMINDER_MS, nextRound, quietHours, quietUntilMs } from "./round.mjs";
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

// ----------------------------------------------------------------- status

const FIELDS = ["alerts", "checkedAt", "failingSince", "firstRoundAt", "incidents", "lastFailure", "lines", "ok", "quietUntil", "streak", "v", "wouldHaveRaised"];

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
});
