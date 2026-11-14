import { env } from "@/lib/env";
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
 * What it never returns: error text, row data, counts, keys, project names.
 * The body holds exactly the five keys of PublicHealth.
 */
export const DATABASE_TIMEOUT_MS = 5_000;

export interface PublicHealth {
  ok: boolean;
  status: "healthy" | "unhealthy";
  env: string;
  failing: string[];
  timestamp: string;
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
  if (!(await checkDatabase())) failing.push("database");
  const ok = failing.length === 0;
  return {
    ok,
    status: ok ? "healthy" : "unhealthy",
    env: env.NODE_ENV,
    failing,
    timestamp: now.toISOString(),
  };
}
