/**
 * The monitor's logic without the Workers runtime import, so `node --test` can
 * load it. worker.mjs wires it to the scheduled and fetch events.
 */
import { CheckFailed, makeGet, runChecks } from "../checks.mjs";
import { alertsConfigured, sendAlert } from "./alert.mjs";
import { fileAlert } from "./inbox.mjs";
import { ROW_QUIET_HOURS, nextRound, nextRows } from "./round.mjs";
import { publicStatus, words } from "./status.mjs";

export const RETRY_WAIT_MS = 30_000;

/** The one result a rehearsal round uses: no request to the site, a forced failure. */
export const REHEARSAL_RESULT = { ok: false, lines: [], failure: "rehearsal: forced failure" };

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

/**
 * One round: check, fold into the stored state, then alert. The state is stored
 * before any alert goes out, so a failed alert never loses the round. The email
 * path (alert.mjs) is unchanged and stays off without its settings. The row path
 * (inbox.mjs) has its own quiet; REHEARSAL=1 (a throwaway copy of the monitor,
 * monitor-deploy.yml) makes no request to the site, forces one failure, treats
 * both quiets as over and files at most one row.
 */
export async function runRound(env, deps = {}) {
  const now = deps.now ?? Date.now();
  const log = deps.log ?? console.log;
  const rehearsal = env.REHEARSAL === "1";
  const s = stub(env);
  const result = rehearsal ? REHEARSAL_RESULT : await runChecksTwice(env, { fetchImpl: deps.fetchImpl, sleep: deps.sleep });
  const prev = await s.get();
  const { state, events } = nextRound(prev, result, now, env.QUIET_HOURS, { skipQuiet: rehearsal });
  const { rows, toFile } = nextRows(prev && prev.rows, { bound: Boolean(env.CREW_INTAKE), events, now, rehearsal });
  state.rows = rows;
  await s.put(state);
  for (const event of events) await sendAlert(env, event, deps.alertFetch ?? fetch, log);
  if (toFile.length > 0) {
    for (const event of toFile) {
      const answer = await fileAlert(env, event, log);
      state.rows = { ...state.rows, filed: state.rows.filed + (answer === "filed" ? 1 : 0), lastResult: answer };
    }
    await s.put(state);
  }
  return state;
}

/** Same text, compared without stopping at the first difference. */
function sameText(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * OPS-397: the rehearsal copy runs its round on request instead of waiting for a
 * fresh Worker's cron. It exists only when REHEARSAL is "1" (the copy: the live
 * monitor never has it) and REHEARSAL_NONCE is a per-run secret of at least 32
 * characters that the workflow sends in x-rehearsal-nonce. Everything else, on
 * either Worker, is the same 404 as any unknown path.
 */
export function isRehearsalStart(request, env) {
  const nonce = env.REHEARSAL_NONCE;
  return (
    env.REHEARSAL === "1" &&
    typeof nonce === "string" &&
    nonce.length >= 32 &&
    request.method === "POST" &&
    new URL(request.url).pathname === "/rehearse" &&
    sameText(request.headers.get("x-rehearsal-nonce"), nonce)
  );
}

/** GET /status from the stored state, and POST /rehearse on a rehearsal copy; 404 for everything else. */
export async function handleFetch(request, env, now = Date.now(), deps = {}) {
  const url = new URL(request.url);
  if (isRehearsalStart(request, env)) {
    await runRound(env, { ...deps, now });
    return new Response(JSON.stringify({ ok: true, round: "done" }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
    });
  }
  if (url.pathname !== "/status" || request.method !== "GET") return new Response("Not found", { status: 404 });
  const answer = publicStatus(await stub(env).get(), now, {
    alertsConfigured: alertsConfigured(env),
    quietHours: env.QUIET_HOURS,
    rowsBound: Boolean(env.CREW_INTAKE),
    rowQuietHours: env.REHEARSAL === "1" ? 0 : ROW_QUIET_HOURS,
  });
  return new Response(JSON.stringify(answer.body), {
    status: answer.status,
    headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
