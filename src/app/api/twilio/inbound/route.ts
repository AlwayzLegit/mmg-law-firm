import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Empty TwiML — we acknowledge receipt without auto-replying (an attorney
// reviews and responds from the admin).
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
function twiml() {
  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "content-type": "text/xml" },
  });
}

/**
 * Verify Twilio's X-Twilio-Signature: HMAC-SHA1 of (url + sorted param
 * key/value pairs) keyed by the auth token, base64-encoded.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
function isValidSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto
    .createHmac("sha1", env.TWILIO_AUTH_TOKEN)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Inbound SMS webhook. Twilio POSTs form-encoded params when a lead replies to
 * one of our texts. We verify the signature, match the sender's phone to a
 * lead, and append the reply to that lead's message thread (service-role
 * insert, so it's recorded even though the public has no DB access).
 */
export async function POST(request: Request) {
  // Without an auth token we can't validate authenticity — acknowledge but
  // never write. (In production the token is always set.)
  if (!env.TWILIO_AUTH_TOKEN) return twiml();

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const raw = await request.text();
  const form = new URLSearchParams(raw);
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = v;

  const url = `${siteUrl()}/api/twilio/inbound`;
  if (!signature || !isValidSignature(url, params, signature)) {
    // Reject forged/unsigned requests.
    return new NextResponse("invalid signature", { status: 403 });
  }

  const from = (params.From ?? "").trim();
  const body = (params.Body ?? "").trim();
  const messageSid = params.MessageSid ?? null;
  if (!from || !body) return twiml();

  const supabase = getServiceSupabase();

  // Match the most recent lead with this phone number (already E.164).
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lead) {
    await supabase.from("lead_messages").insert({
      lead_id: lead.id,
      channel: "sms",
      direction: "inbound",
      body: body.slice(0, 2000),
      status: "received",
      provider_id: messageSid,
    });
  }
  // If no lead matches, we still 200 so Twilio doesn't retry. (An unmatched
  // reply is rare — it would mean a text from a number we never stored.)

  return twiml();
}
