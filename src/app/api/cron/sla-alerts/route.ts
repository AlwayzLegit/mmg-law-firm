import { NextResponse, type NextRequest } from "next/server";

import { FIRM } from "@/lib/constants";
import { requireCronAuth } from "@/lib/cron/auth";
import { findBreachedLeads, markSlaAlerted } from "@/lib/data/sla-alerts";
import { renderSlaAlert } from "@/lib/email/sla-alert";
import { sendEmail } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { sendSms } from "@/lib/sms/twilio";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Speed-to-lead breach alert. Authorized by CRON_SECRET as
 * "Authorization: Bearer <CRON_SECRET>" (see src/lib/cron/auth.ts). Every 15
 * minutes: leads still in `new` past SLA_TARGET_MINUTES that have not been
 * alerted get one email to LEAD_NOTIFY_EMAIL and one SMS to the firm line,
 * then `sla_alerted_at` is stamped so they never alert twice. The weekday
 * agenda email keeps listing them after that. First names only.
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
  const now = Date.now();
  const leads = await findBreachedLeads(supabase, now);
  if (leads.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "none-waiting" });
  }

  const { subject, html, sms } = renderSlaAlert(leads);
  const email = await sendEmail({ to, subject, html });
  if (!email.ok) {
    // Leave sla_alerted_at null so the next run retries.
    return NextResponse.json(
      { ok: false, error: email.error ?? "send-failed" },
      { status: 502 },
    );
  }

  const text = await sendSms({ to: FIRM.phoneTel, body: sms });
  if (!text.ok && text.reason !== "twilio-unconfigured") {
    console.error(`[sla-alerts] sms failed: ${text.reason ?? "unknown"}`);
  }

  await markSlaAlerted(
    supabase,
    leads.map((l) => l.id),
    now,
  );

  return NextResponse.json({
    ok: true,
    sent: true,
    leads: leads.length,
    oldestMinutes: leads[0].minutes,
    sms: text.ok && text.reason !== "twilio-unconfigured",
  });
}

export const GET = handle;
export const POST = handle;
