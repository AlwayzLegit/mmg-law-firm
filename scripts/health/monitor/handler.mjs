/**
 * The monitor's logic without the Workers runtime import, so `node --test` can
 * load it. worker.mjs wires it to the scheduled and fetch events.
 */
import { CheckFailed, makeGet, runChecks } from "../checks.mjs";
import { alertsConfigured, sendAlert } from "./alert.mjs";
import { nextRound } from "./round.mjs";
import { publicStatus, words } from "./status.mjs";

export const RETRY_WAIT_MS = 30_000;

const stub = (env) => env.MONITOR_STATE.get(env.MONITOR_STATE.idFromName("monitor"));
const sleepReal = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs the checks once, and once more after 30 seconds when a check failed, as
 * probe.mjs does. Any other error is a failed round with the fixed reason
 * "probe error". Returns { ok, lines, failure }. Never throws.
 */
export async function runChecksTwice(env, { fetchImpl = fetch, sleep = sleepReal, now = Date.now } = {}) {
  const get = makeGet(env.SITE_URL, fetchImpl);
  let failure = "check failed";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const lines = await runChecks(get, { withHealth: true, now: now() });
      return { ok: true, lines, failure: null };
    } catch (e) {
      if (!(e instanceof CheckFailed)) return { ok: false, lines: [], failure: "probe error" };
      failure = words(e.message);
      if (attempt === 1) await sleep(RETRY_WAIT_MS);
    }
  }
  return { ok: false, lines: [], failure };
}

/** One round: check, fold into the stored state, then alert. */
export async function runRound(env, deps = {}) {
  const now = deps.now ?? Date.now();
  const s = stub(env);
  const result = await runChecksTwice(env, { fetchImpl: deps.fetchImpl, sleep: deps.sleep });
  const { state, events } = nextRound(await s.get(), result, now, env.QUIET_HOURS);
  await s.put(state);
  for (const event of events) await sendAlert(env, event, deps.alertFetch ?? fetch, deps.log ?? console.log);
  return state;
}

/** GET /status from the stored state; 404 for everything else. Makes no outbound request. */
export async function handleFetch(request, env, now = Date.now()) {
  const url = new URL(request.url);
  if (url.pathname !== "/status" || request.method !== "GET") return new Response("Not found", { status: 404 });
  const answer = publicStatus(await stub(env).get(), now, {
    alertsConfigured: alertsConfigured(env),
    quietHours: env.QUIET_HOURS,
  });
  return new Response(JSON.stringify(answer.body), {
    status: answer.status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
