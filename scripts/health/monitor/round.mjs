/**
 * One monitoring round as a pure function (OPS-59): the stored state, the
 * result of one run of the checks and the time go in; the new state and the
 * alert events come out.
 *
 * Quiet start (a new alarm starts quiet for 24 hours): the state stores
 * firstRoundAt once, and the monitor is quiet until that time plus the quiet
 * hours. No date lives in the config, so there is nothing to move when a merge
 * slips and nothing to parse into a date that can be out of range (the bug that
 * sent OPS-60 back). In the quiet time a failed round is only written to
 * wouldHaveRaised: no incident, no event, no email.
 *
 * Outside it, a failed round opens an incident (event "start"), a failed round
 * an hour after the last alert sends a "reminder", and the first passing round
 * closes the incident ("recovery").
 */
export const MAX_KEPT = 20;
export const REMINDER_MS = 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const MIN_QUIET_HOURS = 24;
export const MAX_QUIET_HOURS = 720;
/** The row path (Inbox rows through crew-intake, OPS-352) has its own quiet, counted from the first round it is bound. */
export const ROW_QUIET_HOURS = 24;

const keep = (list) => list.slice(-MAX_KEPT);
const finite = (n) => typeof n === "number" && Number.isFinite(n);

/**
 * The quiet time in hours from the QUIET_HOURS setting: 24 when it is missing,
 * empty, not a number or below 24, and never more than 720. Never throws.
 */
export function quietHours(value) {
  if (value === undefined || value === null || String(value).trim() === "") return MIN_QUIET_HOURS;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n) || n < MIN_QUIET_HOURS) return MIN_QUIET_HOURS;
  return Math.min(n, MAX_QUIET_HOURS);
}

/** firstRoundAt plus the quiet time, in ms. firstRoundAt is always a finite number here. */
export const quietUntilMs = (firstRoundAt, hours) => firstRoundAt + quietHours(hours) * HOUR_MS;

/**
 * prev: stored state or null. result: { ok, lines, failure } from one round.
 * Returns { state, events }.
 */
export function nextRound(prev, result, now, hours, { skipQuiet = false } = {}) {
  const p = prev && typeof prev === "object" ? prev : {};
  const firstRoundAt = finite(p.firstRoundAt) ? p.firstRoundAt : now;
  const quiet = !skipQuiet && now < quietUntilMs(firstRoundAt, hours);
  const failed = result.ok !== true;
  const events = [];

  const prevStreak = finite(p.streak) && p.streak > 0 ? p.streak : 0;
  const streak = failed ? prevStreak + 1 : 0;
  const since = failed ? (prevStreak > 0 && finite(p.since) ? p.since : now) : null;
  let incidents = Array.isArray(p.incidents) ? p.incidents : [];
  let wouldHaveRaised = Array.isArray(p.wouldHaveRaised) ? p.wouldHaveRaised : [];
  let open = p.open && typeof p.open === "object" ? p.open : null;

  if (quiet) {
    if (failed) wouldHaveRaised = keep([...wouldHaveRaised, { at: now, reason: result.failure ?? "check failed" }]);
  } else if (failed && !open) {
    open = { from: now, reason: result.failure ?? "check failed", rounds: 1, lastAlertAt: now };
    events.push({ type: "start", reason: open.reason, from: now });
  } else if (failed && open) {
    open = { ...open, reason: result.failure ?? open.reason, rounds: (finite(open.rounds) ? open.rounds : 1) + 1 };
    if (now - (finite(open.lastAlertAt) ? open.lastAlertAt : 0) >= REMINDER_MS) {
      open.lastAlertAt = now;
      events.push({ type: "reminder", reason: open.reason, from: open.from });
    }
  } else if (!failed && open) {
    incidents = keep([...incidents, { from: open.from, to: now, reason: open.reason, rounds: finite(open.rounds) ? open.rounds : 1 }]);
    events.push({ type: "recovery", reason: open.reason, from: open.from, to: now });
    open = null;
  }

  return {
    state: {
      firstRoundAt,
      checkedAt: now,
      ok: !failed,
      streak,
      since,
      lines: Array.isArray(result.lines) ? result.lines.slice(-12) : [],
      lastFailure: failed ? (result.failure ?? "check failed") : (typeof p.lastFailure === "string" ? p.lastFailure : null),
      incidents,
      wouldHaveRaised,
      open,
    },
    events,
  };
}

/** rowsFrom plus the row path's quiet time, in ms. */
export const rowsQuietUntilMs = (rowsFrom, hours = ROW_QUIET_HOURS) => rowsFrom + hours * HOUR_MS;

/**
 * The row path for one round (OPS-352). prev: the stored rows record or
 * undefined. events: what nextRound emitted. bound: whether the CREW_INTAKE
 * binding exists. A new alarm starts quiet: the first round that sees the
 * binding stores rowsFrom, and before rowsFrom plus 24 hours each event is only
 * kept in wouldHaveFiled (kind and time, the last 20) and nothing is filed. No
 * date lives in the config. In a rehearsal the quiet is over and at most one
 * row is ever filed. Returns { rows, toFile }: the record to store and the
 * events to file now.
 */
export function nextRows(prev, { bound, events, now, rehearsal = false }) {
  const p = prev && typeof prev === "object" ? prev : {};
  const rowsFrom = finite(p.rowsFrom) ? p.rowsFrom : bound ? now : null;
  const filed = finite(p.filed) && p.filed > 0 ? p.filed : 0;
  const lastResult = typeof p.lastResult === "string" ? p.lastResult : null;
  let wouldHaveFiled = Array.isArray(p.wouldHaveFiled) ? p.wouldHaveFiled : [];
  let toFile = [];
  if (bound && rowsFrom !== null) {
    const quiet = !rehearsal && now < rowsQuietUntilMs(rowsFrom);
    if (quiet) wouldHaveFiled = keep([...wouldHaveFiled, ...events.map((e) => ({ at: now, kind: e.type }))]);
    else toFile = rehearsal ? (filed >= 1 ? [] : events.slice(0, 1)) : events;
  }
  return { rows: { rowsFrom, filed, lastResult, wouldHaveFiled }, toFile };
}
