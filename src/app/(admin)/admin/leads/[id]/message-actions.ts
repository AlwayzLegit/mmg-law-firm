"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { sendSms } from "@/lib/sms/twilio";
import { sendEmail } from "@/lib/email/resend";
import {
  FIRM,
  FIRM_FULL_ADDRESS,
  DISCLAIMERS,
} from "@/lib/constants";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MessageInput = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["sms", "email"]),
  subject: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Message can't be empty").max(2000),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap an admin's plain-text email body in a minimal HTML shell with the
 *  firm signature footer + the CRPC advertising/general disclaimers. */
function renderEmailHtml(body: string): string {
  const safe = escapeHtml(body).replace(/\n/g, "<br/>");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a2e">
${safe}
</div>
<hr style="border:none;border-top:1px solid #e5e5ea;margin:24px 0"/>
<p style="font-size:12px;line-height:1.5;color:#6b7280">
${escapeHtml(FIRM.legalName)} · ${escapeHtml(FIRM_FULL_ADDRESS)} · ${escapeHtml(FIRM.phone)}<br/>
${escapeHtml(DISCLAIMERS.advertising)} ${escapeHtml(DISCLAIMERS.general)}
</p>`;
}

/**
 * Send an SMS or email to a lead and log it to the lead's message thread.
 * Every attempt is recorded — including failures (status='failed') — so the
 * thread is a complete communication history. PII (the message body) is never
 * written to server logs; only provider error codes are.
 */
export async function sendLeadMessage(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = MessageInput.safeParse({
    leadId: formData.get("leadId"),
    channel: formData.get("channel"),
    subject: formData.get("subject") ?? undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { leadId, channel, subject, body } = parsed.data;

  const supabase = await getServerSupabase();
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, full_name, phone, email")
    .eq("id", leadId)
    .maybeSingle();
  if (leadErr || !lead) {
    return { ok: false, error: leadErr?.message ?? "Lead not found" };
  }

  let status: "sent" | "failed" = "sent";
  let providerId: string | null = null;
  let sendError: string | null = null;

  if (channel === "sms") {
    if (!lead.phone) {
      return { ok: false, error: "This lead has no phone number on file." };
    }
    const r = await sendSms({ to: lead.phone, body });
    if (!r.ok) {
      status = "failed";
      sendError = r.reason ?? "SMS failed to send.";
    } else if (r.reason === "twilio-unconfigured") {
      status = "failed";
      sendError =
        "SMS isn't configured yet — add the Twilio 10DLC number and credentials to send texts.";
    } else {
      providerId = r.sid ?? null;
    }
  } else {
    if (!lead.email) {
      return { ok: false, error: "This lead has no email address on file." };
    }
    const r = await sendEmail({
      to: lead.email,
      subject: subject || `Message from ${FIRM.legalName}`,
      html: renderEmailHtml(body),
      replyTo: FIRM.intakeEmail,
    });
    if (!r.ok) {
      status = "failed";
      sendError = r.error ?? "Email failed to send.";
    }
  }

  // Log the attempt regardless of outcome.
  const { error: insErr } = await supabase.from("lead_messages").insert({
    lead_id: leadId,
    channel,
    direction: "outbound",
    author_id: user.id,
    subject: channel === "email" ? subject || null : null,
    body,
    status,
    provider_id: providerId,
    error: sendError,
  });
  if (insErr) {
    return { ok: false, error: insErr.message };
  }

  logAudit({
    actor_id: user.id,
    entity: "leads",
    entity_id: leadId,
    action: "message_sent",
    diff: { channel, status },
  });

  revalidatePath(`/admin/leads/${leadId}`);

  if (status === "failed") {
    return { ok: false, error: sendError ?? "Message failed to send." };
  }
  return { ok: true };
}
