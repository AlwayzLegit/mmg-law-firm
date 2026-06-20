import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getLeadAnalytics } from "@/lib/data/lead-analytics";
import { renderLeadDigestEmail } from "@/lib/email/lead-digest";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The digest queries Postgres and renders an email — give it headroom.
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Weekly lead digest. Authorized by CRON_SECRET — Vercel Cron sends it as
 * "Authorization: Bearer <CRON_SECRET>"; a "?secret=" query is also accepted
 * for manual testing. Emails a 30-day lead summary to LEAD_NOTIFY_EMAIL.
 *
 * Wire it up with a Vercel Cron entry (see vercel.json). Contains aggregate
 * counts only — no client PII leaves the database.
 */
async function handle(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "cron-not-configured" },
      { status: 503 },
    );
  }

  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const query = new URL(request.url).searchParams.get("secret");
  const provided = bearer ?? query ?? "";
  if (!safeEqual(provided, env.CRON_SECRET)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      {
        status: 401,
      },
    );
  }

  const to = env.LEAD_NOTIFY_EMAIL;
  if (!to) {
    return NextResponse.json(
      { ok: false, error: "no-recipient" },
      { status: 503 },
    );
  }

  const supabase = getServiceSupabase();
  const analytics = await getLeadAnalytics(supabase, 30);
  const { subject, html } = renderLeadDigestEmail(analytics);

  const result = await sendEmail({ to, subject, html });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "send-failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    last7: analytics.last7,
    signed: analytics.signed,
  });
}

// Vercel Cron issues GET; allow POST for manual triggering too.
export const GET = handle;
export const POST = handle;
