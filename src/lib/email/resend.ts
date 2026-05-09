import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";

let cached: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cached) {
    cached = new Resend(env.RESEND_API_KEY);
  }
  return cached;
}

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = getResend();
  if (!resend || !env.RESEND_FROM_EMAIL) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email] (dev stub) would send:", { to, subject });
    }
    return { ok: true };
  }
  try {
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo,
    });
    if (error) {
      console.warn("[email] resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn("[email] exception:", msg);
    return { ok: false, error: msg };
  }
}
