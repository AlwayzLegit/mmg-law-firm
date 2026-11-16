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
 * What it never returns: error text, row data, keys, project names, a path.
 * The body holds exactly the seven keys of PublicHealth.
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

/** True only when one published row came back without an error. */
export async function checkDatabase(
  timeoutMs = DATABASE_TIMEOUT_MS,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data, error } = await getStaticSupabase()
      .from("practice_areas")
      .select("id")
      .eq("is_published", true)
      .limit(1)
      .abortSignal(AbortSignal.timeout(timeoutMs));
    if (error) {
      // The error code only: no message (it can quote the request) and no personal data.
      console.error("health: database check failed", error.code ?? "unknown");
      return false;
    }
    return Array.isArray(data) && data.length === 1;
  } catch {
    console.error("health: database check threw");
    return false;
  }
}

export async function publicHealth(
  now: Date = new Date(),
): Promise<PublicHealth> {
  const failing: string[] = [];
  const [databaseOk, counts] = await Promise.all([
    checkDatabase(),
    readErrorCounts(),
  ]);
  if (!databaseOk) failing.push("database");
  const ok = failing.length === 0;
  return {
    ok,
    status: ok ? "healthy" : "unhealthy",
    env: env.NODE_ENV,
    failing,
    timestamp: now.toISOString(),
    errors24h: counts.errors24h,
    errors3h: counts.errors3h,
  };
}
