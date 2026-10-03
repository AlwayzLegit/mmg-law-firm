import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";

import { hashToken, parseToken } from "./api-keys";
import { hasScope, type Scope } from "./scopes";

/**
 * Bearer-token auth for the admin API (`/api/admin/*`).
 *
 * Two kinds of credential are accepted:
 *   1. The legacy shared secret in the `ADMIN_API_KEY` env var — behaves as a
 *      key with the `*` scope. Kept so existing n8n/Cowork flows keep working.
 *   2. A per-client key from the `api_keys` table (`mmg_<prefix>_<secret>`),
 *      with explicit scopes, a per-hour rate limit, expiry and revocation.
 *
 * Usage in a route handler:
 *
 *   const auth = await authenticateApi(req, ["blog:write"]);
 *   if (!auth.ok) return auth.response;
 *   const { principal } = auth;
 */

export type ApiPrincipal = {
  kind: "legacy" | "key";
  /** api_keys.id, or null for the legacy env key. */
  id: string | null;
  name: string;
  prefix: string | null;
  scopes: ReadonlySet<string>;
  rateLimitPerHour: number;
};

export type ApiAuth =
  | { ok: true; principal: ApiPrincipal }
  | { ok: false; response: Response };

const LEGACY_PRINCIPAL_NAME = "Legacy ADMIN_API_KEY";
const DEFAULT_RATE_LIMIT = 600;

export async function authenticateApi(
  req: Request,
  required: Scope[] = [],
): Promise<ApiAuth> {
  const presented = bearerToken(req);
  const envKey = env.ADMIN_API_KEY;
  const tableLookupPossible =
    isSupabaseConfigured() && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);

  if (!envKey && !tableLookupPossible) {
    return deny(503, {
      error: "Admin API is not configured. Set ADMIN_API_KEY or create an API key.",
    });
  }
  if (!presented) {
    return deny(401, { error: "Unauthorized." });
  }

  let principal: ApiPrincipal | null = null;

  if (envKey && safeEqual(presented, envKey)) {
    principal = {
      kind: "legacy",
      id: null,
      name: LEGACY_PRINCIPAL_NAME,
      prefix: null,
      scopes: new Set(["*"]),
      rateLimitPerHour: DEFAULT_RATE_LIMIT,
    };
  } else if (tableLookupPossible) {
    principal = await lookupKey(presented);
  }

  if (!principal) {
    return deny(401, { error: "Unauthorized." });
  }

  const missing = required.filter((s) => !hasScope(principal!.scopes, s));
  if (missing.length > 0) {
    return deny(403, {
      error: `Missing scope: ${missing.join(", ")}`,
      required: missing,
    });
  }

  const limit = await checkRateLimit(
    `api:${principal.id ?? "legacy"}`,
    principal.rateLimitPerHour,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Rate limit exceeded.",
          retry_after_seconds: limit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": String(limit.retryAfterSeconds),
            "x-ratelimit-limit": String(principal.rateLimitPerHour),
          },
        },
      ),
    };
  }

  return { ok: true, principal };
}

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  key_hash: string;
  scopes: string[] | null;
  rate_limit_per_hour: number | null;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
};

async function lookupKey(token: string): Promise<ApiPrincipal | null> {
  const parsed = parseToken(token);
  if (!parsed) return null;

  let row: KeyRow | null = null;
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("api_keys")
      .select(
        "id, name, prefix, key_hash, scopes, rate_limit_per_hour, expires_at, revoked_at, last_used_at",
      )
      .eq("prefix", parsed.prefix)
      .maybeSingle();
    if (error) {
      console.warn("[api-auth] key lookup failed:", error.message);
      return null;
    }
    row = (data as KeyRow | null) ?? null;
  } catch (err) {
    console.warn("[api-auth] key lookup exception:", err);
    return null;
  }
  if (!row) return null;
  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }
  if (!safeEqual(hashToken(token), row.key_hash)) return null;

  touchLastUsed(row);

  return {
    kind: "key",
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    scopes: new Set(row.scopes ?? []),
    rateLimitPerHour: row.rate_limit_per_hour ?? DEFAULT_RATE_LIMIT,
  };
}

/** Bump last_used_at at most every 5 minutes. Fire-and-forget. */
function touchLastUsed(row: KeyRow): void {
  const last = row.last_used_at ? new Date(row.last_used_at).getTime() : 0;
  if (Date.now() - last < 5 * 60 * 1000) return;
  try {
    const supabase = getServiceSupabase();
    void supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(
        () => undefined,
        () => undefined,
      );
  } catch {
    // never fail auth over a bookkeeping write
  }
}

function bearerToken(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

function deny(status: number, body: unknown): ApiAuth {
  return { ok: false, response: json(status, body) };
}

/** Constant-time string compare that tolerates length differences. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still run a compare to avoid leaking length via timing, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Small JSON Response helper used across the admin API. */
export function json(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
  });
}

/** Parse a JSON body, returning a 400 Response on failure. */
export function parseJsonBody(raw: string): { ok: true; body: unknown } | { ok: false; response: Response } {
  if (!raw.trim()) return { ok: false, response: json(400, { error: "Body must be valid JSON." }) };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, response: json(400, { error: "Body must be valid JSON." }) };
  }
}

/** Clamp a numeric query param. */
export function clampInt(n: unknown, lo: number, hi: number, fallback: number): number {
  const v = Number(n);
  if (n == null || n === "" || Number.isNaN(v)) return fallback;
  return Math.min(Math.max(Math.trunc(v), lo), hi);
}
