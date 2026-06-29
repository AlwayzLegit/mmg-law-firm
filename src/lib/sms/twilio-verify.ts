import "server-only";

import crypto from "node:crypto";

import { env } from "@/lib/env";

/**
 * Verify Twilio's X-Twilio-Signature header: HMAC-SHA1 of (url + sorted param
 * key/value pairs) keyed by the auth token, base64-encoded.
 * https://www.twilio.com/docs/usage/security#validating-requests
 *
 * Returns false when the auth token is unset (can't verify → don't trust).
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
): boolean {
  if (!env.TWILIO_AUTH_TOKEN || !signature) return false;
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

/** Parse a form-encoded webhook body into a plain params map. */
export function formToParams(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(raw).entries()) params[k] = v;
  return params;
}
