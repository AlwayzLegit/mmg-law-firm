import { NextResponse, type NextRequest } from "next/server";

import { safeEqual } from "@/lib/api/auth";
import { env } from "@/lib/env";

/**
 * Authorization for the /api/cron/* routes, platform-neutral by design.
 *
 * Every scheduler calls the route over HTTP with
 * `Authorization: Bearer <CRON_SECRET>`:
 *   - Vercel Cron (vercel.json) adds the header itself.
 *   - Cloudflare Cron Triggers invoke the Worker's `scheduled()` handler,
 *     which fetches the same route with the same header (see
 *     docs/cloudflare-migration-plan.md).
 *   - A human runs `curl -H "Authorization: Bearer $CRON_SECRET" …`.
 *
 * The secret is accepted in the header only. A `?secret=` query string used
 * to work too, but secrets in URLs land in access logs, browser history and
 * analytics referrers, so that path is gone.
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "cron-not-configured" },
      { status: 503 },
    );
  }
  const bearer =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!bearer || !safeEqual(bearer, env.CRON_SECRET)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }
  return null;
}
