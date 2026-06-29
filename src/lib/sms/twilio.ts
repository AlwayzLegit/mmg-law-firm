import "server-only";

import { env } from "@/lib/env";

export type SmsResult = {
  ok: boolean;
  /** Twilio message SID on success — stored for correlation with replies. */
  sid?: string;
  reason?: string;
};

/**
 * Send an SMS via the Twilio REST API. Uses `fetch` with HTTP Basic auth so we
 * don't need the `twilio` npm package (keeps the bundle lean and works on the
 * Node runtime). When creds are unset we no-op (dev stub) so local/preview
 * environments stay functional without Twilio.
 *
 * 10DLC note: production sending requires a registered 10DLC brand/campaign on
 * the `TWILIO_FROM_NUMBER`. Until that's live, Twilio may reject with error
 * 30034 — surfaced here in `reason` rather than thrown.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SmsResult> {
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[sms] (dev stub) would send to", to.slice(0, 6) + "…");
    }
    return { ok: true, reason: "twilio-unconfigured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
  ).toString("base64");
  const form = new URLSearchParams({
    To: to,
    From: env.TWILIO_FROM_NUMBER,
    Body: body,
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
      cache: "no-store",
    });
    const data = (await res.json()) as {
      sid?: string;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      // Don't log message content (PII); log only the provider error.
      console.warn("[sms] twilio error", data.code, data.message);
      return { ok: false, reason: data.message ?? `twilio-${res.status}` };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn("[sms] twilio request failed:", msg);
    return { ok: false, reason: msg };
  }
}
