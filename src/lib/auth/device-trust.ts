import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getServiceSupabase } from "@/lib/supabase/admin";

/**
 * Device-trust second factor for admin login.
 *
 * The browser holds an opaque random token in an httpOnly cookie. We persist
 * only its SHA-256 hash (in `trusted_devices`, scoped to the user). A device is
 * "trusted" for a user while a non-expired row matches (user_id, hash). When a
 * device is not trusted, the login flow demands a one-time email code (or the
 * emailed link) before granting admin access.
 *
 * All DB access here uses the service-role client — `trusted_devices` has RLS
 * enabled with no policies, so anon/authenticated cannot read or write it.
 */

export const DEVICE_COOKIE = "mmg_device";
export const TRUST_DAYS = 30;

// Cookie lifetime is a bit longer than the DB trust window so the same opaque
// token can be re-trusted (re-verified) without minting a new one each cycle.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Read the opaque device token from the request cookies, if present. */
export async function getDeviceToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(DEVICE_COOKIE)?.value ?? null;
}

/**
 * True when the current browser is a remembered device for `userId`. Side
 * effect: bumps `last_used_at` so active devices don't look stale. Read-only
 * with respect to cookies — safe to call from server components / requireAdmin.
 */
export async function isDeviceTrusted(userId: string): Promise<boolean> {
  const token = await getDeviceToken();
  if (!token) return false;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("trusted_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) return false;

  await supabase
    .from("trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return true;
}

function shortLabelFromUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
      ? "Chrome"
      : /Firefox/.test(ua)
        ? "Firefox"
        : /Safari/.test(ua)
          ? "Safari"
          : "Browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "device";
  return `${browser} on ${os}`;
}

/**
 * Remember the current browser as a trusted device for `userId` for TRUST_DAYS.
 * Mints a device token + sets the cookie if one isn't already present, then
 * upserts the hash with a refreshed expiry. Must be called from a context that
 * can write cookies (server action or route handler).
 */
export async function trustCurrentDevice(userId: string): Promise<void> {
  const store = await cookies();
  let token = store.get(DEVICE_COOKIE)?.value ?? null;
  if (!token) {
    token = randomBytes(32).toString("base64url");
    store.set(DEVICE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
  }

  const hdrs = await headers();
  const label = shortLabelFromUserAgent(hdrs.get("user-agent"));
  const expiresAt = new Date(
    Date.now() + TRUST_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const supabase = getServiceSupabase();
  await supabase.from("trusted_devices").upsert(
    {
      user_id: userId,
      device_hash: hashToken(token),
      label,
      last_used_at: new Date().toISOString(),
      expires_at: expiresAt,
    },
    { onConflict: "user_id,device_hash" },
  );
}

/** Forget every remembered device for a user (used by "sign out other devices"). */
export async function revokeAllDevices(userId: string): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from("trusted_devices").delete().eq("user_id", userId);
}
