/**
 * The public answer of GET /status (OPS-59). The one place that decides what
 * leaves the Worker: it rebuilds the answer field by field from a fixed list, so
 * a field added to the stored state later is never exposed by accident, and every
 * free-text value is cut to fixed words, numbers and a path of the site. Never a
 * response body, a header, an address or a secret.
 */
import { quietUntilMs, rowsQuietUntilMs } from "./round.mjs";

export const STATUS_MAX_AGE_MS = 45 * 60 * 1000;

// A Date can only show +/- 8.64e15 ms; beyond that toISOString throws, so such a
// value is shown as null and never lets /status fail.
const DATE_LIMIT_MS = 8_640_000_000_000_000;
const iso = (ms) => (typeof ms === "number" && Number.isFinite(ms) && Math.abs(ms) <= DATE_LIMIT_MS ? new Date(ms).toISOString() : null);
const num = (n) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
const list = (x, n) => (Array.isArray(x) ? x.slice(-n) : []);

/**
 * Failure and line texts come from the checks: a path, fixed words, a status
 * number, a form marker. Anything outside this alphabet is dropped, and the
 * text is cut to 160 characters.
 */
export const words = (s) => String(s ?? "").replace(/[^A-Za-z0-9 /_?=.,:()'-]/g, "").slice(0, 160);

/**
 * The row path (Inbox rows through crew-intake, OPS-352) as /status shows it:
 * "not bound" without the binding, "quiet" until its own 24 hours are over,
 * then "on". Built field by field; lastResult is one of the fixed words the
 * monitor stores ("filed", "refused", "failed", "not bound").
 */
function rowAlerts(rows, now, { rowsBound, rowQuietHours }) {
  const r = rows && typeof rows === "object" ? rows : {};
  const from = typeof r.rowsFrom === "number" && Number.isFinite(r.rowsFrom) ? r.rowsFrom : null;
  const until = from === null ? null : iso(rowsQuietUntilMs(from, rowQuietHours));
  const quiet = from === null || now < rowsQuietUntilMs(from, rowQuietHours);
  return {
    state: !rowsBound ? "not bound" : quiet ? "quiet" : "on",
    quietUntil: until,
    filed: num(r.filed),
    lastResult: typeof r.lastResult === "string" ? words(r.lastResult) : null,
  };
}

/** 503 when no round is stored or the last is over 45 minutes old: the monitor itself stopped. */
export function publicStatus(raw, now, { alertsConfigured, quietHours, rowsBound = false, rowQuietHours = 24 }) {
  const s = raw && typeof raw === "object" ? raw : {};
  const checkedAtMs = typeof s.checkedAt === "number" ? s.checkedAt : null;
  const fresh = checkedAtMs !== null && now - checkedAtMs <= STATUS_MAX_AGE_MS;
  const first = typeof s.firstRoundAt === "number" && Number.isFinite(s.firstRoundAt) ? s.firstRoundAt : null;
  return {
    status: fresh ? 200 : 503,
    body: {
      v: 1,
      ok: fresh && s.ok === true,
      checkedAt: iso(checkedAtMs),
      firstRoundAt: iso(first),
      quietUntil: first === null ? null : iso(quietUntilMs(first, quietHours)),
      failingSince: iso(s.since),
      streak: num(s.streak),
      lines: list(s.lines, 12).map(words),
      lastFailure: typeof s.lastFailure === "string" ? words(s.lastFailure) : null,
      alerts: alertsConfigured ? "configured" : "not configured",
      rowAlerts: rowAlerts(s.rows, now, { rowsBound, rowQuietHours }),
      wouldHaveFiled: list(s.rows && s.rows.wouldHaveFiled, 20).map((w) => ({ at: iso(w?.at), kind: words(w?.kind) })),
      wouldHaveRaised: list(s.wouldHaveRaised, 20).map((w) => ({ at: iso(w?.at), reason: words(w?.reason) })),
      incidents: list(s.incidents, 20).map((i) => ({
        from: iso(i?.from),
        to: iso(i?.to),
        reason: words(i?.reason),
        rounds: num(i?.rounds),
      })),
    },
  };
}
