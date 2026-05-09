import { env } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server-side verification of a Cloudflare Turnstile token. Must be called
 * from a route handler / server action — never from the browser.
 *
 * In dev we may not have a real Turnstile secret. To preserve the ability to
 * exercise the lead form locally, we accept submissions when the secret is
 * unset BUT log a clear warning. In production, missing secret = reject.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (env.NODE_ENV === "production") {
      return { ok: false, reason: "turnstile-secret-missing" };
    }
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY missing — accepting token in dev",
    );
    return { ok: true };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[turnstile] network error", err);
    return { ok: false, reason: "network-error" };
  }

  if (!response.ok) {
    return { ok: false, reason: `cf-status-${response.status}` };
  }

  const data = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  if (!data.success) {
    return {
      ok: false,
      reason: (data["error-codes"] ?? ["unknown"]).join(","),
    };
  }
  return { ok: true };
}
