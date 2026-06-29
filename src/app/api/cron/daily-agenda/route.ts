import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getDailyAgenda } from "@/lib/data/daily-agenda";
import { renderDailyAgendaEmail } from "@/lib/email/daily-agenda";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Daily agenda email. Authorized by CRON_SECRET (Vercel Cron sends it as
 * "Authorization: Bearer <CRON_SECRET>"; "?secret=" also works for manual
 * testing). Emails the day's overdue/due tasks, due follow-ups, and new
 * unassigned intake to LEAD_NOTIFY_EMAIL. Skips sending on an empty day so it
 * never becomes noise. PII-light by construction (see getDailyAgenda).
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
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const to = env.LEAD_NOTIFY_EMAIL;
  if (!to) {
    return NextResponse.json(
      { ok: false, error: "no-recipient" },
      { status: 503 },
    );
  }

  const supabase = getServiceSupabase();
  const agenda = await getDailyAgenda(supabase);

  // Don't email an empty agenda — keeps the inbox signal-only. (A "?force=1"
  // query still sends, for testing.)
  const force = new URL(request.url).searchParams.get("force") === "1";
  if (agenda.empty && !force) {
    return NextResponse.json({ ok: true, sent: false, reason: "empty-day" });
  }

  const { subject, html } = renderDailyAgendaEmail(agenda);
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
    overdue: agenda.overdueTasks.length,
    dueToday: agenda.todayTasks.length,
    followUps: agenda.followUps.length,
    newLeads: agenda.newLeads.length,
  });
}

export const GET = handle;
export const POST = handle;
