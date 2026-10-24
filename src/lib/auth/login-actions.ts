"use server";

import { z } from "zod";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/seo/canonical";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { FIRM } from "@/lib/constants";

/**
 * Admin sign-in: email + password, plus the standard forgot-password flow.
 *
 * The only emails this flow ever sends are the admin invite (settings) and
 * the password-reset link below. Both are generated server-side with
 * `auth.admin.generateLink` and delivered through Resend, so Supabase's own
 * mailer (default SMTP, heavily rate-limited) is never involved. Both links
 * are `token_hash` links verified by /auth/callback, which needs no prior
 * browser state, so they work from any device or mail app.
 */

export type LoginResult =
  | { ok: true; redirect: string }
  | { ok: false; error: string };

const Email = z.string().trim().toLowerCase().email();
const Password = z.string().min(1);

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
    return { ok: false, error: "Incorrect email or password." };
  }

  if (!(await isAdminUser(data.user.id))) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account isn't authorized for the admin.",
    };
  }

  return { ok: true, redirect: safeNext(input.next) };
}

/**
 * Email a password-reset link. The link signs the admin in and lands on
 * /reset-password to choose a new password. It also works for an invited
 * admin who never finished setting one up.
 *
 * Always reports success so the form cannot be used to discover which
 * addresses are admins; the email is only sent when the address belongs to
 * an admin_profiles user. Limited to 5 requests per address per hour.
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<{ ok: true }> {
  const email = Email.safeParse(input.email);
  if (!email.success) return { ok: true };

  const limit = await checkRateLimit(`pw-reset:${email.data}`, 5);
  if (!limit.allowed) return { ok: true };

  const admin = getServiceSupabase();
  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: email.data,
  });
  if (error || !link?.user || !link.properties?.hashed_token) {
    return { ok: true };
  }
  if (!(await isAdminUser(link.user.id))) return { ok: true };

  const url = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(
    link.properties.hashed_token,
  )}&type=recovery&next=${encodeURIComponent("/reset-password")}`;

  await sendEmail({
    to: email.data,
    subject: `Reset your ${FIRM.legalName} admin password`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin: 0 0 12px;">Reset your password</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          We received a request to reset the admin password for this address.
          Click the button to choose a new one. The link works once and
          expires in one hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="display: inline-block; background: #2b46d8; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Reset password
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #888;">
          If you didn't request this, you can ignore this email. Your password
          stays the same until you choose a new one.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #aaa;">${FIRM.legalName}</p>
      </div>
    `,
  });

  return { ok: true };
}
