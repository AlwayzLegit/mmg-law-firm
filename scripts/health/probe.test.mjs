// Run with: node --test scripts/health/probe.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CheckFailed,
  FALLBACK_MARKER,
  FALLBACK_QUIET_UNTIL,
  FORM_MARKERS,
  PRODUCTION_URL,
  USER_AGENT,
  makeGet,
  parseArgs,
  probe,
  runChecks,
} from "./probe.mjs";

const FORM = FORM_MARKERS.join(" ");
const SCRIPT = "/_next/static/chunks/abc.js";

function goodRoutes() {
  return {
    "/": { text: "<title>MMG Law Firm</title>" },
    "/contact": { text: `<html>${FORM}<script src="${SCRIPT}"></script></html>` },
    "/contact?_rsc=health": { text: `<html>${FORM}</html>` },
    [SCRIPT]: { text: "console.log(1)" },
    "/practice-areas/car-accidents": { text: "<h1>California Car Accident Lawyer</h1>" },
  };
}

function stub(routes) {
  const sent = [];
  const fetchImpl = async (url, init) => {
    sent.push({ url, method: init.method, ua: init.headers["User-Agent"] });
    const path = url.replace(PRODUCTION_URL, "");
    const r = routes[path];
    if (!r) return new Response("not found", { status: 404 });
    return new Response(r.text, { status: r.status ?? 200 });
  };
  return { sent, get: makeGet(PRODUCTION_URL, fetchImpl) };
}

async function failureOf(routes) {
  const { get } = stub(routes);
  try {
    await runChecks(get);
  } catch (e) {
    assert.ok(e instanceof CheckFailed, "a CheckFailed, not a crash");
    return e.message;
  }
  assert.fail("expected the probe to fail");
}

test("the good path passes, prints the proof lines and sends only GET", async () => {
  const { get, sent } = stub(goodRoutes());
  const lines = await runChecks(get);
  assert.ok(lines.includes("contact: form present (stored page)"));
  assert.ok(lines.includes("contact: form present (app Worker)"));
  assert.ok(lines.includes("contact: page script loads"));
  assert.equal(lines.at(-1), "health: OK");
  assert.ok(sent.every((s) => s.method === "GET"));
  assert.ok(sent.every((s) => s.ua === USER_AGENT));
  assert.ok(sent.every((s) => !s.url.includes("/api/leads")), "never touches the lead endpoint");
});

test("a 404 fails", async () => {
  const r = goodRoutes();
  delete r["/"];
  assert.match(await failureOf(r), /^\/: status 404/);
});

test("a contact page without the form fails, naming the missing marker", async () => {
  for (const marker of FORM_MARKERS) {
    const r = goodRoutes();
    r["/contact"] = { text: `${FORM.replace(marker, "")}<script src="${SCRIPT}"></script>` };
    assert.match(await failureOf(r), new RegExp(`/contact: .*missing`), marker);
  }
});

test("the app Worker rendering without the form fails while the stored page passes", async () => {
  const r = goodRoutes();
  r["/contact?_rsc=health"] = { text: "<html>Internal error</html>" };
  assert.match(await failureOf(r), /\/contact\?_rsc=health/);
});

test("a script file that answers 404 fails", async () => {
  const r = goodRoutes();
  delete r[SCRIPT];
  assert.match(await failureOf(r), /status 404/);
});

test("a contact page that names no script fails", async () => {
  const r = goodRoutes();
  r["/contact"] = { text: FORM };
  assert.match(await failureOf(r), /names no script/);
});

test("a practice page without its heading fails", async () => {
  const r = goodRoutes();
  r["/practice-areas/car-accidents"] = { text: "<h1>Page</h1>" };
  assert.match(await failureOf(r), /Car Accident is missing/);
});

test("a site that does not exist fails, as the self-test needs", async () => {
  const { get } = stub({});
  await assert.rejects(() => runChecks(get), CheckFailed);
});

test("probe returns 0 or 1 and waits between attempts", async () => {
  const waits = [];
  const sleep = async (ms) => { waits.push(ms); };
  assert.equal(await probe({ attempts: 2, wait: 30 }, stub(goodRoutes()).get, sleep), 0);
  assert.deepEqual(waits, []);
  assert.equal(await probe({ attempts: 2, wait: 30 }, stub({}).get, sleep), 1);
  assert.deepEqual(waits, [30_000]);
});

test("a failure on the first attempt that clears on the second passes", async () => {
  const good = stub(goodRoutes()).get;
  let calls = 0;
  const flaky = async (path) => (path === "/" && calls++ === 0 ? { status: 503, text: "" } : good(path));
  assert.equal(await probe({ attempts: 2, wait: 0 }, flaky, async () => {}), 0);
});

test("parseArgs has the documented defaults and rejects unknown flags", () => {
  assert.deepEqual(parseArgs([]), { base: PRODUCTION_URL, attempts: 2, wait: 30 });
  assert.equal(parseArgs(["--base", "https://x.test", "--attempts", "1"]).attempts, 1);
  assert.throws(() => parseArgs(["--bogus", "1"]));
});

// OPS-27: the database check behind --with-health.
const HEALTHY = JSON.stringify({ ok: true, status: "healthy", env: "production", failing: [], timestamp: "2026-11-14T19:00:00.000Z" });
const UNHEALTHY = JSON.stringify({ ok: false, status: "unhealthy", env: "production", failing: ["database"], timestamp: "2026-11-14T19:00:00.000Z" });

async function withHealth(extra) {
  const { get } = stub({ ...goodRoutes(), ...extra });
  const logged = [];
  try {
    const lines = await runChecks(get, { withHealth: true, log: (l) => logged.push(l) });
    return { lines, logged };
  } catch (e) {
    assert.ok(e instanceof CheckFailed, "a CheckFailed, not a crash");
    return { error: e.message, logged };
  }
}

test("with --with-health a healthy database prints database: ok", async () => {
  const r = await withHealth({ "/api/health": { text: HEALTHY } });
  assert.ok(r.lines.includes("database: ok"));
  assert.equal(r.lines.at(-1), "health: OK");
});

test("without the flag /api/health is not requested", async () => {
  const { get, sent } = stub(goodRoutes());
  await runChecks(get);
  assert.ok(sent.every((s) => !s.url.includes("/api/health")));
});

test("a 404 on /api/health is a warning that does not fail the run", async () => {
  const r = await withHealth({});
  assert.ok(r.lines.includes("database: not deployed yet"));
  assert.ok(r.logged.some((l) => l.startsWith("::warning::")));
  assert.equal(r.lines.at(-1), "health: OK");
});

test("a 503 or an unhealthy body fails, naming only the failing check", async () => {
  const r = await withHealth({ "/api/health": { status: 503, text: UNHEALTHY } });
  assert.match(r.error, /^\/api\/health: status 503 \(failing: database\)/);
  const r2 = await withHealth({ "/api/health": { status: 200, text: UNHEALTHY } });
  assert.match(r2.error, /^\/api\/health: status 200/);
});

test("a 200 that is not the health body fails", async () => {
  const r = await withHealth({ "/api/health": { text: "<html>Welcome</html>" } });
  assert.match(r.error, /^\/api\/health: status 200/);
});

test("the probe stays GET only with the health check on", async () => {
  const { get, sent } = stub({ ...goodRoutes(), "/api/health": { text: HEALTHY } });
  await runChecks(get, { withHealth: true });
  assert.ok(sent.every((s) => s.method === "GET"));
});

test("parseArgs takes --with-health as a flag with no value", () => {
  assert.equal(parseArgs(["--with-health"]).withHealth, true);
  const o = parseArgs(["--base", "https://x.test", "--with-health", "--attempts", "1"]);
  assert.deepEqual([o.base, o.attempts, o.withHealth], ["https://x.test", 1, true]);
  assert.equal(parseArgs([]).withHealth, undefined);
});


// OPS-44: the contact page must not show the verification fallback in place of
// the Turnstile widget. Quiet (a warning) until FALLBACK_QUIET_UNTIL, then a failure.
const BEFORE = Date.parse(FALLBACK_QUIET_UNTIL) - 60_000;
const AFTER = Date.parse(FALLBACK_QUIET_UNTIL) + 60_000;
const NOTICE = `Our ${FALLBACK_MARKER}, so this form can't be submitted right now.`;

async function withFallback(routes, now) {
  const { get } = stub({ ...goodRoutes(), ...routes });
  const logged = [];
  try {
    const lines = await runChecks(get, { now, log: (l) => logged.push(l) });
    return { lines, logged };
  } catch (e) {
    assert.ok(e instanceof CheckFailed, "a CheckFailed, not a crash");
    return { error: e.message, logged };
  }
}

test("a clean page prints both no-fallback lines, after the form lines", async () => {
  const { get } = stub(goodRoutes());
  const lines = await runChecks(get);
  const at = (l) => lines.indexOf(l);
  assert.ok(at("contact: no fallback (stored page)") > at("contact: form present (stored page)"));
  assert.ok(at("contact: no fallback (app Worker)") > at("contact: form present (app Worker)"));
  assert.equal(lines.at(-1), "health: OK");
});

test("after the quiet date the fallback in the stored page fails and names /contact", async () => {
  const r = await withFallback({ "/contact": { text: `<html>${FORM}${NOTICE}<script src="${SCRIPT}"></script></html>` } }, AFTER);
  assert.match(r.error, /^\/contact: the verification fallback is shown/);
  assert.match(r.error, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
});

test("after the quiet date the fallback in the fresh page fails and names the fresh path", async () => {
  const r = await withFallback({ "/contact?_rsc=health": { text: `<html>${FORM}${NOTICE}</html>` } }, AFTER);
  assert.match(r.error, /^\/contact\?_rsc=health: the verification fallback is shown/);
});

test("before the quiet date the fallback is a quiet warning and the run stays green", async () => {
  const r = await withFallback({ "/contact": { text: `<html>${FORM}${NOTICE}<script src="${SCRIPT}"></script></html>` } }, BEFORE);
  assert.equal(r.error, undefined);
  assert.ok(r.logged.includes("::warning::health monitor (quiet): /contact shows the verification fallback"));
  assert.equal(r.lines.at(-1), "health: OK");
});

test("the fallback check sends only GET and never touches the lead endpoint", async () => {
  const { get, sent } = stub(goodRoutes());
  await runChecks(get, { now: AFTER });
  assert.ok(sent.every((s) => s.method === "GET"));
  assert.ok(sent.every((s) => !s.url.includes("/api/leads")));
});

test("the fallback marker has no apostrophe or markup that HTML escaping could change", () => {
  assert.match(FALLBACK_MARKER, /^[A-Za-z ]+$/);
});

test("the quiet date is a valid time", () => {
  assert.ok(Number.isFinite(Date.parse(FALLBACK_QUIET_UNTIL)));
});

test("the notice in turnstile.tsx still holds the marker the probe looks for", () => {
  const src = readFileSync(new URL("../../src/components/marketing/turnstile.tsx", import.meta.url), "utf8");
  assert.ok(src.includes(FALLBACK_MARKER));
});
