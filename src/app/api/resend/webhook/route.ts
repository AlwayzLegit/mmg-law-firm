import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Verify a Resend (Svix) webhook signature. The signed content is
 * `${svix-id}.${svix-timestamp}.${body}`, HMAC-SHA256 with the base64-decoded
 * portion of the `whsec_…` secret, base64-encoded. The `svix-signature` header
 * is a space-separated list of `v1,<sig>` entries.
 */
function verifySignature(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): boolean {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const key = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const expected = crypto
    .createHmac("sha256", Buffer.from(key, "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);
  return signatureHeader
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((sig) => {
      const b = Buffer.from(sig);
      return (
        expectedBuf.length === b.length &&
        crypto.timingSafeEqual(expectedBuf, b)
      );
    });
}

/**
 * Resend webhook. Receives email lifecycle events (delivered, opened, bounced,
 * complained) and updates the matching outbound message by its Resend id, so
 * the lead's thread shows whether an email actually landed and was opened.
 */
export async function POST(request: Request) {
  // Can't verify authenticity without the secret — acknowledge but don't write.
  if (!env.RESEND_WEBHOOK_SECRET) {
    return new NextResponse(null, { status: 200 });
  }

  const raw = await request.text();
  const ok = verifySignature(
    env.RESEND_WEBHOOK_SECRET,
    request.headers.get("svix-id") ?? "",
    request.headers.get("svix-timestamp") ?? "",
    raw,
    request.headers.get("svix-signature") ?? "",
  );
  if (!ok) return new NextResponse("invalid signature", { status: 403 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 200 });
  }

  const emailId = event.data?.email_id;
  if (!emailId || !event.type) return new NextResponse(null, { status: 200 });

  const supabase = getServiceSupabase();

  switch (event.type) {
    case "email.delivered":
      // Don't downgrade an already-opened message back to delivered.
      await supabase
        .from("lead_messages")
        .update({ status: "delivered" })
        .eq("provider_id", emailId)
        .eq("direction", "outbound")
        .neq("status", "opened");
      break;
    case "email.opened":
      await supabase
        .from("lead_messages")
        .update({ status: "opened" })
        .eq("provider_id", emailId)
        .eq("direction", "outbound");
      break;
    case "email.bounced":
    case "email.complained":
      await supabase
        .from("lead_messages")
        .update({
          status: "failed",
          error:
            event.type === "email.bounced"
              ? "Email bounced."
              : "Recipient marked as spam.",
        })
        .eq("provider_id", emailId)
        .eq("direction", "outbound");
      break;
    default:
      // delivery_delayed, sent, etc. — no state change.
      break;
  }

  return new NextResponse(null, { status: 200 });
}
