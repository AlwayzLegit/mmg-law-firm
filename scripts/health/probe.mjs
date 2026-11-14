// Health probe for MMG Law (OPS-18). Black-box and read-only: it only sends
// GET, it never submits the lead form and never requests /api/leads. No key.
//
//   node scripts/health/probe.mjs [--base URL] [--attempts 2] [--wait 30] [--with-health]
//
// Checks, in order:
//   a. GET /                                home page answers 200 and has "MMG"
//   b. GET /contact                         the lead form is in the page
//                                           (stored page copy)
//   c. GET /contact?_rsc=health             the same form, rendered fresh by
//                                           the app Worker
//   d. one script file the contact page names (/_next/static/...js) loads
//   e. GET /practice-areas/car-accidents    answers 200 and has "Car Accident"
//   f. GET /api/health  (only with --with-health, OPS-27) 200 and status
//                                           healthy, prints "database: ok".
//                                           A 404 prints "database: not deployed
//                                           yet" and does not fail: the workflow
//                                           reaches main at the merge, the
//                                           endpoint only after the owner's
//                                           deploy approval. A 503 or an
//                                           unhealthy body fails.
//
// Why check c exists: the public hostnames are served by the front Worker
// (cloudflare/front.ts), which answers public pages from a page store and
// passes everything else to the app Worker. So /, /contact and a practice
// page can answer 200 from stored copies while the app Worker is broken.
// isCacheableDocumentRequest in src/lib/cloudflare/page-cache.ts skips the
// store for any request with a _rsc query parameter, so ?_rsc=health reaches
// the app Worker and is rendered fresh, with no write. If that rule changes,
// this check is where it shows.
//
// Why check d exists: a page from an older build can point at script files
// the next deploy removed, and then the lead form never hydrates.
//
// Exit codes: 0 healthy, 1 a check failed, 2 the probe itself broke.

import { pathToFileURL } from "node:url";

export const PRODUCTION_URL = "https://www.mmg-lawfirm.com";
export const USER_AGENT = "mmg-health-monitor/1";
export const REQUEST_TIMEOUT_MS = 15_000;

// What the lead form puts in the HTML (src/components/v3/v3-lead-form.tsx and
// the contact page). All four must be present.
export const FORM_MARKERS = [
  'id="v3-form"',
  'name="phone"',
  'name="consent_contact"',
  "Request My Free Case Evaluation",
];

export class CheckFailed extends Error {
  constructor(path, reason) {
    super(`${path}: ${String(reason).slice(0, 200)}`);
    this.name = "CheckFailed";
  }
}

// Every request goes through here: one place to see that it is GET only.
export function makeGet(base, fetchImpl = fetch) {
  return async function get(path) {
    let res;
    try {
      res = await fetchImpl(`${base.replace(/\/$/, "")}${path}`, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e) {
      throw new CheckFailed(path, `no answer (${e instanceof Error ? e.name : "error"})`);
    }
    return { status: res.status, text: await res.text() };
  };
}

function expectPage(path, res, needles) {
  if (res.status !== 200) throw new CheckFailed(path, `status ${res.status}`);
  for (const n of needles) {
    if (!res.text.includes(n)) throw new CheckFailed(path, `${n} is missing`);
  }
}

// Runs the checks once. Returns the lines it printed (for tests); throws
// CheckFailed on the first failure.
export async function runChecks(get, { log = () => {}, withHealth = false } = {}) {
  const lines = [];
  const say = (line) => { lines.push(line); log(line); };

  expectPage("/", await get("/"), ["MMG"]);
  say("home: ok");

  const contact = await get("/contact");
  expectPage("/contact", contact, FORM_MARKERS);
  say("contact: form present (stored page)");

  const fresh = await get("/contact?_rsc=health");
  expectPage("/contact?_rsc=health", fresh, FORM_MARKERS);
  say("contact: form present (app Worker)");

  const script = /\/_next\/static\/[^"'\s<>]*\.js/.exec(contact.text);
  if (!script) throw new CheckFailed("/contact", "names no script file under /_next/static/");
  const js = await get(script[0]);
  if (js.status !== 200) throw new CheckFailed(script[0], `status ${js.status}`);
  say("contact: page script loads");

  expectPage("/practice-areas/car-accidents", await get("/practice-areas/car-accidents"), ["Car Accident"]);
  say("practice area: ok");

  if (withHealth) {
    const health = await get("/api/health");
    if (health.status === 404) {
      say("database: not deployed yet");
      log("::warning::/api/health answers 404: the endpoint is not deployed yet (waiting for the production deploy approval)");
    } else {
      let body = null;
      try {
        body = JSON.parse(health.text);
      } catch {
        // not JSON: handled below
      }
      if (health.status !== 200 || !body || body.ok !== true || body.status !== "healthy") {
        const failing = Array.isArray(body?.failing) ? ` (failing: ${body.failing.map((f) => String(f).slice(0, 30)).join(", ")})` : "";
        throw new CheckFailed("/api/health", `status ${health.status}${failing}`);
      }
      say("database: ok");
    }
  }

  say("health: OK");
  return lines;
}

export function parseArgs(argv) {
  const out = { base: PRODUCTION_URL, attempts: 2, wait: 30 };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--with-health") {
      out.withHealth = true;
      i -= 1; // a flag with no value
    } else if (k === "--base" && v) out.base = v;
    else if (k === "--attempts" && v) out.attempts = Math.max(1, Number(v) || 1);
    else if (k === "--wait" && v) out.wait = Math.max(0, Number(v) || 0);
    else throw new Error(`unknown argument ${k}`);
  }
  return out;
}

// The whole sequence runs, and on a failure runs once more after the wait.
// Returns 0 or 1.
export async function probe(opts, get, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  let last = null;
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      await runChecks(get, { log: (l) => console.log(l), withHealth: opts.withHealth });
      return 0;
    } catch (e) {
      if (!(e instanceof CheckFailed)) throw e;
      last = e;
      console.log(`attempt ${attempt} of ${opts.attempts} failed: ${e.message}`);
      if (attempt < opts.attempts) await sleep(opts.wait * 1000);
    }
  }
  console.log(`::error::health monitor: ${last.message}`);
  return 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  process.exit(await probe(opts, makeGet(opts.base)));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((e) => {
    console.error(`::error::health probe broke: ${e instanceof Error ? e.message : "unexpected error"}`);
    process.exit(2);
  });
}
