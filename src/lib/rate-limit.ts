import "server-only";

import { withDeadline } from "@/lib/deadline";
import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const WINDOW_SECONDS = 60 * 60; // 1 hour

// A database that does not answer must not hold the form (OPS-347): after this
// long the RPC counts as failed and the in-memory bucket decides.
const RPC_DEADLINE_MS = 3000;

/**
 * The part of a rate limit key that is safe to log: the text before the first
 * colon ("leads", "pw-reset", "api"). The part after it can be a visitor's IP
 * address or an email address and never reaches a log line. A key with no
 * colon, or an odd scope, is "other".
 */
export function rateLimitScope(key: string): string {
  const i = key.indexOf(":");
  if (i <= 0) return "other";
  const scope = key.slice(0, i);
  return /^[a-z0-9-]{1,32}$/.test(scope) ? scope : "other";
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Async rate-limit check. Backed by the Postgres `rate_limits` table +
 * `bump_rate_limit` RPC so multiple serverless instances coordinate.
 *
 * Falls back to a per-instance in-memory bucket when Supabase isn't
 * configured (local dev without `.env.local`) or if the RPC errors —
 * better to allow a borderline request than to lock the form on a
 * transient DB hiccup.
 */
export async function checkRateLimit(
  key: string,
  limit = 5,
): Promise<RateLimitResult> {
  if (!isSupabaseConfigured() || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return checkInMemory(key, limit);
  }

  try {
    const supabase = getServiceSupabase();
    const answer = await withDeadline(
      supabase
        .rpc("bump_rate_limit", {
          p_key: key,
          p_window_seconds: WINDOW_SECONDS,
        })
        .maybeSingle(),
      RPC_DEADLINE_MS,
    );

    if (!answer) {
      console.warn(
        `[rate-limit] RPC timed out for scope=${rateLimitScope(key)}`,
      );
      return checkInMemory(key, limit);
    }
    const { data, error } = answer;

    if (error || !data) {
      console.warn(
        `[rate-limit] RPC failed for scope=${rateLimitScope(key)}: ${error?.message ?? "no data"}`,
      );
      return checkInMemory(key, limit);
    }

    const row = data as { count: number; window_started_at: string };
    if (row.count <= limit) return { allowed: true };

    const windowStart = new Date(row.window_started_at).getTime();
    const elapsed = Date.now() - windowStart;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_SECONDS * 1000 - elapsed) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  } catch (err) {
    // The error's name and a cut message only: the object can carry a row's key value.
    const what =
      err instanceof Error
        ? `${err.name}: ${err.message.slice(0, 200)}`
        : "unknown error";
    console.warn(
      `[rate-limit] exception for scope=${rateLimitScope(key)}: ${what}`,
    );
    return checkInMemory(key, limit);
  }
}

// -------------------------------------------------------------------
// In-memory fallback. Per-instance only — used only when Supabase
// isn't reachable. Kept for local dev and degraded-prod recovery.
// -------------------------------------------------------------------

type Bucket = { count: number; firstAt: number };
const BUCKETS = new Map<string, Bucket>();
const WINDOW_MS = WINDOW_SECONDS * 1000;

function checkInMemory(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const existing = BUCKETS.get(key);

  if (!existing || now - existing.firstAt > WINDOW_MS) {
    BUCKETS.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - existing.firstAt)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}
