// Run with: node --test scripts/health/probe.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CheckFailed,
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
