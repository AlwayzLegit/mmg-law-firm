"use server";

import { z } from "zod";

import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/seo/canonical";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/resend";
import { FIRM } from "@/lib/constants";

/**
 * Admin login: email + password, nothing else.
 *
 * The only emails this flow ever sends are the admin invite (settings) and
 * the sign-in link below. Both are generated server-side with
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
    return {
      ok: false,
      error:
        "Invalid email or password. Never set a password, or forgot it? Use “Email me a sign-in link” below.",
    };
  }

  if (!(await isAdminUser(data.user.id))) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: "This account isn't authorized for admin access.",
    };
  }

  return { ok: true, redirect: safeNext(input.next) };
}

/**
 * Email a one-time sign-in link. This is the single self-service recovery
 * for every stuck state: forgot the password, invite link expired before a
 * password was chosen, or the first owner created from the CLI. The link
 * signs the admin in and lands on /onboarding to choose a password.
 *
 * Always reports success so the form cannot be used to discover which
 * addresses are admins; the email is only sent when the address belongs to
 * an admin_profiles user. Limited to 5 requests per address per hour.
 */
export async function requestSignInLink(input: {
  email: string;
}): Promise<{ ok: true }> {
  const email = Email.safeParse(input.email);
  if (!email.success) return { ok: true };

  const limit = await checkRateLimit(`signin-link:${email.data}`, 5);
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
  )}&type=recovery&next=${encodeURIComponent("/onboarding?reset=1")}`;

  await sendEmail({
    to: email.data,
    subject: `Your ${FIRM.legalName} admin sign-in link`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin: 0 0 12px;">Sign in and choose a password</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          Someone asked for a sign-in link for the admin account at this
          address. The button signs you in and asks you to choose a
          password. It works once and expires in one hour.
        </p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="display: inline-block; background: #2b46d8; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Sign in &amp; choose a password
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #888;">
          If you didn't ask for this, you can ignore this email. Nothing
          changes until the link is opened.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #aaa;">${FIRM.legalName}</p>
      </div>
    `,
  });

  return { ok: true };
}
