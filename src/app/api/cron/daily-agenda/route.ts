import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { requireCronAuth } from "@/lib/cron/auth";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getDailyAgenda } from "@/lib/data/daily-agenda";
import { renderDailyAgendaEmail } from "@/lib/email/daily-agenda";
import { sendEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily agenda email. Authorized by CRON_SECRET as
 * "Authorization: Bearer <CRON_SECRET>" (see src/lib/cron/auth.ts). Emails
 * leads waiting for a first call, the day's overdue/due tasks, due follow-ups
 * and near statute deadlines to LEAD_NOTIFY_EMAIL. Skips sending on an empty
 * day so it never becomes noise. PII-light by construction (see
 * getDailyAgenda).
 */
async function handle(request: NextRequest) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

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
    waiting: agenda.waiting.length,
    breaches: agenda.breaches,
    deadlines: agenda.deadlines.length,
  });
}

export const GET = handle;
export const POST = handle;
