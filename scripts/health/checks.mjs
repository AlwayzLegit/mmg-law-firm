// The health checks of MMG Law (OPS-18, OPS-27, OPS-44), shared by two runners:
// the command line probe (probe.mjs, run by GitHub) and the monitor Worker
// (monitor/, run by Cloudflare every 15 minutes, OPS-59). One list of checks,
// so a check added here reaches both. Black-box and read-only: GET only, no key.
//
// No Node import in this file: the Workers runtime loads it too. A test keeps
// it that way. The reasons for each check are in the header of probe.mjs.

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

// One line of the notice in src/components/marketing/turnstile.tsx. It has no
// apostrophe, so HTML escaping cannot change it. A test keeps both in step.
export const FALLBACK_MARKER = "verification step is temporarily unavailable";

// Tuesday 2026-11-17 00:00 PST. A new alarm records what it would have raised
// for its first 24 hours and raises nothing; the date must stay at least 24
// hours after the merge.
export const FALLBACK_QUIET_UNTIL = "2026-11-17T08:00:00Z";

// OPS-21: /api/health also shows errors24h and errors3h, the server errors (5xx)
// the site gave in about the last 24 and 3 hours, counted by the Worker entry.
// The run fails at this many in 3 hours. The short window on purpose: the probe
// keeps nothing between runs, and a 24 hour count would hold the alarm red for a
// day after a burst that ended. The alarm clears itself 3 hours after the errors stop.
export const MAX_ERRORS_3H = 10;

// A new alarm starts quiet: until this time a count at or above the limit prints
// a warning and the run stays green. Tuesday 2026-11-17 is too early for a merge
// that deploys on Monday and waits for an approval click, so the date is
// Wednesday 2026-11-18 00:00 PST; keep it at least 24 hours after the numbers
// first appear in /api/health.
export const ERRORS_QUIET_UNTIL = "2026-11-18T08:00:00Z";

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

// The verification fallback must not be shown in place of the widget.
function expectNoFallback(path, res, now, log) {
  if (!res.text.includes(FALLBACK_MARKER)) return;
  if (now < Date.parse(FALLBACK_QUIET_UNTIL)) {
    log(`::warning::health monitor (quiet): ${path} shows the verification fallback`);
    return;
  }
  throw new CheckFailed(
    path,
    "the verification fallback is shown in place of the widget (NEXT_PUBLIC_TURNSTILE_SITE_KEY missing from the build?)",
  );
}

const isCount = (n) => typeof n === "number" && Number.isInteger(n) && n >= 0;

// The server error counts in the /api/health body. Returns the line to print.
// No numbers (migration 0040 not applied, or the read failed) is a warning, not
// a failure: the counts never decide whether the database is healthy. A count at
// or above max fails the run, except in the quiet time.
export function checkErrors(body, { max = MAX_ERRORS_3H, now = Date.now(), log = () => {} } = {}) {
  const e3 = body?.errors3h;
  const e24 = body?.errors24h;
  if (!isCount(e3) || !isCount(e24)) {
    log("::warning::/api/health shows no server error counts yet (migration 0040 not applied?)");
    return "errors: not counted yet (migration 0040)";
  }
  if (e3 >= max) {
    if (now < Date.parse(ERRORS_QUIET_UNTIL)) {
      log(`::warning::health monitor (quiet): ${e3} server errors in the last 3 hours`);
      return `errors: ${e3} in 3h, ${e24} in 24h (quiet)`;
    }
    throw new CheckFailed("/api/health errors", `${e3} server errors in the last 3 hours (limit ${max})`);
  }
  return `errors: ${e3} in 3h, ${e24} in 24h`;
}

// Runs the checks once. Returns the lines it printed (for tests); throws
// CheckFailed on the first failure.
export async function runChecks(get, { log = () => {}, withHealth = false, now = Date.now(), maxErrors3h = MAX_ERRORS_3H } = {}) {
  const lines = [];
  const say = (line) => { lines.push(line); log(line); };

  expectPage("/", await get("/"), ["MMG"]);
  say("home: ok");

  const contact = await get("/contact");
  expectPage("/contact", contact, FORM_MARKERS);
  say("contact: form present (stored page)");
  expectNoFallback("/contact", contact, now, log);
  say("contact: no fallback (stored page)");

  const fresh = await get("/contact?_rsc=health");
  expectPage("/contact?_rsc=health", fresh, FORM_MARKERS);
  say("contact: form present (app Worker)");
  expectNoFallback("/contact?_rsc=health", fresh, now, log);
  say("contact: no fallback (app Worker)");

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
        // OPS-348: the class of a database failure (a fixed list in the app), only in the plain alphabet and short.
        const cls = typeof body?.databaseFailure === "string" && /^[A-Za-z0-9 ]{1,30}$/.test(body.databaseFailure) ? `, class: ${body.databaseFailure}` : "";
        const failing = Array.isArray(body?.failing) ? ` (failing: ${body.failing.map((f) => String(f).slice(0, 30)).join(", ")}${cls})` : "";
        throw new CheckFailed("/api/health", `status ${health.status}${failing}`);
      }
      say("database: ok");
      // The last check of the run: a server error count never hides a page or database failure.
      say(checkErrors(body, { max: maxErrors3h, now, log }));
    }
  }

  say("health: OK");
  return lines;
}
