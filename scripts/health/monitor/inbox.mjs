/**
 * Inbox rows for the monitor (OPS-352). On a start, a reminder or a recovery the
 * monitor files one row in the Crew's Notion Inbox through a service binding to
 * the shared intake Worker crew-intake (entrypoint MmgLawIntake, method
 * createAlert, OPS-360). The monitor holds no Notion token and no address of
 * the intake: only the binding, set in wrangler.jsonc.
 *
 * Fixed words only: the failing check is cut to the words() alphabet, the times
 * are ISO, the status address is fixed. Never a response body, a header or any
 * visitor data. Never throws: a failed or refused call is one log line with no
 * address and no body, and the round has stored its state before it is called.
 */
import { words } from "./status.mjs";

export const STATUS_URL = "https://mmg-law-firm-monitor.jetnine-inc.workers.dev/status";

const DATE_LIMIT_MS = 8_640_000_000_000_000;
const iso = (ms) => (typeof ms === "number" && Number.isFinite(ms) && Math.abs(ms) <= DATE_LIMIT_MS ? new Date(ms).toISOString() : null);

/** What createAlert takes, built from one round event { type, reason, from, to }. */
export function alertFor(event, env) {
  return {
    kind: event.type,
    check: words(event.reason) || "check failed",
    from: iso(event.from),
    to: event.type === "recovery" ? iso(event.to) : null,
    statusUrl: STATUS_URL,
    rehearsal: env.REHEARSAL === "1",
  };
}

/** Returns "filed", "refused", "failed" or "not bound". Never throws. */
export async function fileAlert(env, event, log = console.log) {
  if (!env.CREW_INTAKE) return "not bound";
  try {
    const answer = await env.CREW_INTAKE.createAlert(alertFor(event, env));
    if (answer && answer.ok === true) return "filed";
    log(`monitor: inbox alert refused ${words(answer && answer.reason)}`);
    return "refused";
  } catch {
    log("monitor: inbox alert failed");
    return "failed";
  }
}
