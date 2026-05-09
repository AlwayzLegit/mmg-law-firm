import "server-only";

import { env } from "@/lib/env";

/**
 * Twilio SMS stub. The real Twilio client is not installed yet — once 10DLC
 * brand registration is complete, run:
 *   pnpm add twilio
 * then replace this stub with the actual client.
 *
 * Until then, this function logs in dev and no-ops in production.
 */
export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_FROM_NUMBER
  ) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[sms] (dev stub) would send:", { to, body });
    }
    return { ok: true, reason: "twilio-unconfigured" };
  }

  // TODO(group-e): once `twilio` package is installed, do:
  //   const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  //   await client.messages.create({ from: env.TWILIO_FROM_NUMBER, to, body });
  console.warn("[sms] Twilio creds present but client not yet installed");
  return { ok: false, reason: "twilio-client-not-installed" };
}
