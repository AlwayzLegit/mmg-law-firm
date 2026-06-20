"use server";

import { z } from "zod";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/seo/canonical";
import { isDeviceTrusted, trustCurrentDevice } from "@/lib/auth/device-trust";

/**
 * Admin login flow: password-primary, with a one-time email code (6 digits) or
 * the emailed link required on devices that haven't been verified in the last
 * TRUST_DAYS. The device-trust check is enforced again in requireAdmin(), so a
 * stolen password or session alone can't reach /admin from a new device.
 */

export type LoginResult =
  | { ok: true; redirect: string }
  | { ok: true; step: "verify"; email: string }
  | { ok: false; error: string };

const Email = z.string().trim().toLowerCase().email();
const Password = z.string().min(1);
const Code = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

function safeNext(next: string | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/admin";
}

/** Confirm the signed-in user has an admin_profiles row (service-role read). */
async function isAdminUser(userId: string): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
  next?: string;
}): Promise<LoginResult> {
  const email = Email.safeParse(input.email);
  const password = Password.safeParse(input.password);
  if (!email.success || !password.success) {
    return { ok: false, error: "Enter your email and password." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.data,
    password: password.data,
  });
  if (error || !data.user) {
    return { ok: false, error: "Invalid email or password." };
  }

  if (!(await isAdminUser(data.user.id))) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account isn't authorized for admin access.",
    };
  }

  if (await isDeviceTrusted(data.user.id)) {
    return { ok: true, redirect: safeNext(input.next) };
  }

  // New / unrecognized device: require the second factor before granting
  // access. Email a one-time code (template can also surface the link).
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false },
  });
  return { ok: true, step: "verify", email: email.data };
}

export async function verifyDeviceCode(input: {
  email: string;
  code: string;
  next?: string;
}): Promise<LoginResult> {
  const email = Email.safeParse(input.email);
  const code = Code.safeParse(input.code);
  if (!email.success) return { ok: false, error: "Enter your email." };
  if (!code.success) {
    return { ok: false, error: "Enter the 6-digit code from your email." };
  }

  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.data,
    token: code.data,
    type: "email",
  });
  if (error || !data.user) {
    return {
      ok: false,
      error: "That code didn't work — it may have expired. Request a new one.",
    };
  }

  if (!(await isAdminUser(data.user.id))) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account isn't authorized for admin access.",
    };
  }

  await trustCurrentDevice(data.user.id);
  return { ok: true, redirect: safeNext(input.next) };
}

/** Resend the one-time code to the same address. */
export async function sendDeviceCode(input: {
  email: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = Email.safeParse(input.email);
  if (!email.success) return { ok: false, error: "Enter a valid email." };
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fallback / bootstrap path: email a magic link. Clicking it verifies the
 * device in /auth/callback (email control proves the device), which also makes
 * this the way to sign in the very first time before a password is set.
 */
export async function sendMagicLink(input: {
  email: string;
  next?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = Email.safeParse(input.email);
  if (!email.success) return { ok: false, error: "Enter a valid email." };
  const next = safeNext(input.next);
  const supabase = await getServerSupabase();
  // shouldCreateUser: true so the very first sign-in (before any password is
  // set) creates the auth user. Admin access is still gated by an
  // admin_profiles row in requireAdmin(), so an unprivileged auth user that
  // signs in this way can't reach /admin.
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
