// Health probe for MMG Law (OPS-18). Black-box and read-only: it only sends
// GET, it never submits the lead form and never requests /api/leads. No key.
//
//   node scripts/health/probe.mjs [--base URL] [--attempts 2] [--wait 30] [--with-health]
//
// Checks, in order:
//   a. GET /                                home page answers 200 and has "MMG"
//   b. GET /contact                         the lead form is in the page
//                                           (stored page copy), and the
//                                           verification fallback is not
//                                           shown in place of the widget
//   c. GET /contact?_rsc=health             the same form, rendered fresh by
//                                           the app Worker, same two checks
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
// Why the fallback check exists (OPS-44): a build without
// NEXT_PUBLIC_TURNSTILE_SITE_KEY ships a notice in place of the Turnstile
// widget. The form still loads and the page answers 200, but the server
// refuses every enquiry. The four form markers pass either way, so only the
// notice's own sentence shows it. The check starts quiet: until
// FALLBACK_QUIET_UNTIL a page that holds the sentence prints a warning and the
// run stays green; from then on it fails the run. It cannot see a widget that
// Cloudflare rejects in the browser (the same notice, shown after the script
// runs).
//
// Why check d exists: a page from an older build can point at script files
// the next deploy removed, and then the lead form never hydrates.
//
// Exit codes: 0 healthy, 1 a check failed, 2 the probe itself broke.

import { pathToFileURL } from "node:url";

import {
  CheckFailed,
  FALLBACK_MARKER,
  FALLBACK_QUIET_UNTIL,
  FORM_MARKERS,
  PRODUCTION_URL,
  REQUEST_TIMEOUT_MS,
  USER_AGENT,
  makeGet,
  runChecks,
} from "./checks.mjs";

// The checks moved to checks.mjs (OPS-59) so the monitor Worker runs the same
// list. Everything is exported again here, so callers and tests are unchanged.
export {
  CheckFailed,
  FALLBACK_MARKER,
  FALLBACK_QUIET_UNTIL,
  FORM_MARKERS,
  PRODUCTION_URL,
  REQUEST_TIMEOUT_MS,
  USER_AGENT,
  makeGet,
  runChecks,
};

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
