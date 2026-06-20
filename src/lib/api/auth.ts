import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Bearer-token auth for the admin API (`/api/admin/*`). Machine-to-machine:
 * callers send `Authorization: Bearer <ADMIN_API_KEY>`. The key is a single
 * shared secret stored in Vercel env — rotate by changing it there.
 *
 * Returns `null` when the request is authorized, or a ready-to-return
 * `Response` (401/503) when it isn't, so route handlers can:
 *
 *   const denied = authorizeAdminApi(req);
 *   if (denied) return denied;
 */
export function authorizeAdminApi(req: Request): Response | null {
  const expected = env.ADMIN_API_KEY;
  if (!expected) {
    return json(503, {
      error: "Admin API is not configured. Set ADMIN_API_KEY.",
    });
  }

  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const presented = match?.[1]?.trim() ?? "";
  if (!presented || !safeEqual(presented, expected)) {
    return json(401, { error: "Unauthorized." });
  }
  return null;
}

/** Constant-time string compare that tolerates length differences. */
function safeEqual(a: string, b: string): boolean {
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
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
