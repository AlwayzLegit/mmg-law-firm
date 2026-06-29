import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { verifyTwilioSignature, formToParams } from "@/lib/sms/twilio-verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Twilio MessageStatus → our lead_messages.status enum.
const STATUS_MAP: Record<string, "sent" | "delivered" | "failed"> = {
  sent: "sent",
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
};

/**
 * Twilio status-callback webhook. As a sent SMS moves through queued → sent →
 * delivered (or failed/undelivered), Twilio POSTs the new MessageStatus here.
 * We verify the signature and update the matching outbound message by its SID,
 * so the thread reflects real delivery state — not just "we tried."
 */
export async function POST(request: Request) {
  if (!env.TWILIO_AUTH_TOKEN) return new NextResponse(null, { status: 200 });

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const params = formToParams(await request.text());

  const url = `${siteUrl()}/api/twilio/status`;
  if (!verifyTwilioSignature(url, params, signature)) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const sid = params.MessageSid ?? params.SmsSid ?? "";
  const mapped = STATUS_MAP[params.MessageStatus ?? ""];
  if (sid && mapped) {
    const supabase = getServiceSupabase();
    const update: { status: string; error?: string | null } = { status: mapped };
    if (mapped === "failed") {
      update.error = params.ErrorCode
        ? `Twilio error ${params.ErrorCode}`
        : "Carrier reported the message undelivered.";
    }
    await supabase
      .from("lead_messages")
      .update(update)
      .eq("provider_id", sid)
      .eq("direction", "outbound");
  }

  return new NextResponse(null, { status: 200 });
}
