import { env } from "@/lib/env";
import { envName } from "@/lib/cloudflare/error-count";
import { getStaticSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Health answer for GET /api/health (OPS-27).
 *
 * Why it exists: public pages are served from stored copies by the front
 * Worker, so they keep loading when the database is down, while every
 * enquiry sent through the lead form (/api/leads) is lost. This says whether
 * the database answers right now.
 *
 * Least privilege: the public-key client reads one published practice area id,
 * which the public can already read (RLS policy practice_areas_public_read).
 * Never the service role. Fail closed: no configuration, an error, a timeout
 * or no row all mean unhealthy.
 *
 * Server errors (OPS-21): the body also holds errors24h and errors3h, the
 * number of 5xx answers the site gave in about the last 24 and 3 hours (the
 * Worker entry counts them, supabase/migrations/0040_error_counts.sql). Counts
 * only, by the owner's decision of 2026-11-14 ("the count is public too"). They
 * are read through error_counts_recent, which the anon key may call and which
 * returns nothing but those two numbers. null means not counted: migration 0040
 * is not applied yet, or the read failed. The counts never change ok, status,
 * failing or the 503: a 503 keeps meaning that the database does not answer.
 *
 * Why it fails (OPS-348): while the database check fails, the body also holds
 * databaseFailure, one word group from the fixed list DatabaseFailure (a timeout,
 * a network error, an HTTP status class, a SQLSTATE class, a PostgREST code, no
 * row, not configured, other), so a run can read the class of an outage from
 * outside without the Supabase dashboard. When the database answers the key is
 * absent, not null.
 *
 * What it never returns: error text, row data, keys, project names, a path.
 * The body holds exactly the seven keys of PublicHealth, plus databaseFailure
 * (from the fixed list only) while the database check fails.
 */
export const DATABASE_TIMEOUT_MS = 5_000;

export interface PublicHealth {
  ok: boolean;
  status: "healthy" | "unhealthy";
  env: string;
  failing: string[];
  timestamp: string;
  /** Server errors (5xx) in about the last 24 hours; null when not counted. */
  errors24h: number | null;
  /** Server errors (5xx) in about the last 3 hours; null when not counted. */
  errors3h: number | null;
  /** Only while the database check fails (OPS-348): the class of the failure, from the fixed list. */
  databaseFailure?: DatabaseFailure;
}

/**
 * The class of a failed database check (OPS-348). A fixed list: the value is never
 * built from error text, a message, a key or a row. All characters are in the
 * alphabet the monitor keeps in its failure text.
 */
export type DatabaseFailure =
  | "timeout"
  | "network"
  | "http 401"
  | "http 402"
  | "http 403"
  | "http 4xx"
  | "http 5xx"
  | `pg ${string}`
  | "pgrst"
  | "no row"
  | "not configured"
  | "other";

/**
 * Reduce a failed check to its class. `error` is the error of the client's answer (or the thrown value),
 * `status` the HTTP status of the answer. Only the code, the status and the NAME of a timeout are read,
 * never a message that is printed or returned.
 */
export function classifyDatabaseFailure(input: {
  error?: unknown;
  status?: unknown;
}): DatabaseFailure {
  const e = (input.error ?? {}) as Record<string, unknown>;
  const text = `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : ""}`;
  // The abort of AbortSignal.timeout: a TimeoutError or AbortError, however the client words it.
  if (/abort|timeout|timed out/i.test(text)) return "timeout";
  const code = typeof e.code === "string" ? e.code : "";
  if (/^PGRST/i.test(code)) return "pgrst";
  if (/^[0-9A-Z]{5}$/.test(code)) return `pg ${code.slice(0, 2)}`;
  const status = typeof input.status === "number" ? input.status : undefined;
  if (status === 0) return "network";
  if (status === 401 || status === 402 || status === 403) return `http ${status}`;
  if (status !== undefined && status >= 400 && status < 500) return "http 4xx";
  if (status !== undefined && status >= 500 && status < 600) return "http 5xx";
  return "other";
}

export interface DatabaseCheck {
  ok: boolean;
  failure?: DatabaseFailure;
}

export interface ErrorCounts {
  errors24h: number | null;
  errors3h: number | null;
}

const NOT_COUNTED: ErrorCounts = { errors24h: null, errors3h: null };

const isCount = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 0;

/**
 * The two server-error counts of this environment. Any error, a missing
 * function (migration 0040 not applied), a timeout or an answer that is not two
 * whole numbers gives null for both. Only the error code is logged.
 */
export async function readErrorCounts(
  timeoutMs = DATABASE_TIMEOUT_MS,
): Promise<ErrorCounts> {
  if (!isSupabaseConfigured()) return NOT_COUNTED;
  try {
    const { data, error } = await getStaticSupabase()
      .rpc("error_counts_recent", { p_env: envName(env.NEXT_PUBLIC_SITE_URL) })
      .abortSignal(AbortSignal.timeout(timeoutMs));
    if (error) {
      console.error("health: error counts not read", error.code ?? "unknown");
      return NOT_COUNTED;
    }
    const row: unknown = Array.isArray(data) ? data[0] : data;
    const r = (row ?? {}) as Record<string, unknown>;
    if (isCount(r.errors24h) && isCount(r.errors3h)) {
      return { errors24h: r.errors24h, errors3h: r.errors3h };
    }
    return NOT_COUNTED;
  } catch {
    console.error("health: error counts threw");
    return NOT_COUNTED;
  }
}

/** ok is true only when one published row came back without an error; otherwise failure is the class. */
export async function checkDatabase(
  timeoutMs = DATABASE_TIMEOUT_MS,
): Promise<DatabaseCheck> {
  if (!isSupabaseConfigured()) return { ok: false, failure: "not configured" };
  try {
    const { data, error, status } = await getStaticSupabase()
      .from("practice_areas")
      .select("id")
      .eq("is_published", true)
      .limit(1)
      .abortSignal(AbortSignal.timeout(timeoutMs));
    if (error) {
      // The error code only: no message (it can quote the request) and no personal data.
      console.error("health: database check failed", error.code ?? "unknown");
      return { ok: false, failure: classifyDatabaseFailure({ error, status }) };
    }
    if (Array.isArray(data) && data.length === 1) return { ok: true };
    return { ok: false, failure: "no row" };
  } catch (err) {
    console.error("health: database check threw");
    const failure = classifyDatabaseFailure({ error: err });
    // A thrown error that is not a timeout is a failed request: the client did not get an answer.
    return { ok: false, failure: failure === "other" ? "network" : failure };
  }
}

export async function publicHealth(
  now: Date = new Date(),
): Promise<PublicHealth> {
  const failing: string[] = [];
  const [database, counts] = await Promise.all([
    checkDatabase(),
    readErrorCounts(),
  ]);
  if (!database.ok) failing.push("database");
  const ok = failing.length === 0;
  return {
    ok,
    status: ok ? "healthy" : "unhealthy",
    env: env.NODE_ENV,
    failing,
    timestamp: now.toISOString(),
    errors24h: counts.errors24h,
    errors3h: counts.errors3h,
    // Absent, not null, while the database answers: a healthy body is as it was.
    ...(database.ok ? {} : { databaseFailure: database.failure ?? "other" }),
  };
}
