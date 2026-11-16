import { NextResponse } from "next/server";

import { publicHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health: whether the database answers (OPS-27). 200 when healthy,
 * 503 when not. Public, read-only, no secret and no client data in the body
 * (see src/lib/health.ts). It also shows two server-error counts (OPS-21),
 * numbers only. Never cached: the front Worker passes /api/ through
 * to the app Worker and does not store it, so this always shows the app Worker
 * and the database as they are now. Other methods answer 405.
 */
export async function GET() {
  const body = await publicHealth();
  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
