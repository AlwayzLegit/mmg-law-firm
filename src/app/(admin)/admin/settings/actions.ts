"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/leads/intake";
import { FIRM } from "@/lib/constants";

const InviteInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(["owner", "staff", "intake"]),
});

export type InviteResult =
  | { ok: true; resent: boolean }
  | { ok: false; error: string };

type ServiceClient = ReturnType<typeof getServiceSupabase>;

/**
 * Generate a one-time sign-in link for an admin.
 *
 * We use `admin.generateLink` (not `inviteUserByEmail`) because we send the
 * email ourselves via Resend and, crucially, build a `token_hash` link that
 * /auth/callback verifies with `verifyOtp`. That works for a brand-new user
 * with no prior browser state — unlike the PKCE `?code=` flow, whose verifier
 * cookie the invitee never has.
 *
 * `invite` creates the auth user if absent. If they already exist — e.g. a
 * user who was removed (which deletes only the admin_profiles row, not the
 * auth user), a pending invitee being re-sent their link, or one invited
 * before — `invite` fails, so we fall back to `magiclink`, which signs the
 * existing user in. The fallback is unconditional and exception-safe:
 * Supabase's "already exists" error can arrive as a returned error OR a
 * thrown exception, and its exact wording varies, so we never gate the
 * fallback on matching error text.
 *
 * Every link lands on /onboarding. requireAdmin() sends an admin without a
 * password there anyway, so going straight to it saves a redirect hop; an
 * admin who already has a password is bounced from /onboarding to /admin.
 */
async function generateAdminSignInLink(
  supabase: ServiceClient,
  email: string,
): Promise<
  | { ok: true; userId: string; url: string; created: boolean }
  | { ok: false; error: string }
> {
  const next = encodeURIComponent("/onboarding");

  async function linkFor(
    type: "invite" | "magiclink",
  ): Promise<
    | { data: { userId: string; url: string }; error: null }
    | { data: null; error: string | null }
  > {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type,
        email,
      });
      if (error || !data?.user || !data.properties?.hashed_token) {
        return { data: null, error: error?.message ?? null };
      }
      const url = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(
        data.properties.hashed_token,
      )}&type=${type}&next=${next}`;
      return { data: { userId: data.user.id, url }, error: null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }

  let res = await linkFor("invite");
  let created = true;
  // If the invite didn't produce a link for ANY reason (the common one being
  // an already-existing auth user), sign the existing user in with a magic
  // link instead.
  if (!res.data) {
    res = await linkFor("magiclink");
    created = false;
  }
  if (!res.data) {
    return { ok: false, error: res.error ?? "Couldn't create invite." };
  }
  return { ok: true, ...res.data, created };
}

/** The invite email body. Shared by the first invite and every resend. */
function inviteEmail(opts: {
  url: string;
  inviterName: string | null;
  role: string;
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to the ${FIRM.legalName} admin`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin: 0 0 12px;">You're invited to ${FIRM.legalName}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          ${escapeHtml(opts.inviterName ?? "An administrator")} has invited you
          to the ${FIRM.legalName} admin as
          <strong>${escapeHtml(opts.role)}</strong>. Click the button below to
          choose your password and get started.
        </p>
        <p style="margin: 24px 0;">
          <a href="${opts.url}" style="display: inline-block; background: #2b46d8; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accept invite &amp; choose a password
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #888;">
          The link works once and expires in one hour. If it has expired,
          open <a href="${siteUrl()}/login" style="color: #2b46d8;">the sign-in page</a>
          and choose &ldquo;Email me a sign-in link&rdquo; to get a fresh one
          &mdash; no need to ask anyone. If you weren't expecting this, you can
          ignore this email.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #aaa;">${FIRM.legalName}</p>
      </div>
    `,
  };
}

/**
 * Invite a new admin user. Only existing owners can invite.
 *
 * Generates a token_hash sign-in link, upserts an admin_profiles row binding
 * the user to a role, then emails the link via Resend. The new user lands at
 * /auth/callback after clicking, which verifies the link, signs them in and
 * sends them to /onboarding to choose a password.
 *
 * Inviting an address that already has admin access is refused with a
 * pointer to the row's "Resend invite" / role controls, so a typo can't
 * silently change a colleague's role. A removed admin (auth user still
 * exists, profile row gone) is re-added normally.
 */
export async function inviteAdmin(formData: FormData): Promise<InviteResult> {
  const { profile, user } = await requireAdmin();

  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can invite new admins." };
  }

  const parsed = InviteInput.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = getServiceSupabase();

  const link = await generateAdminSignInLink(supabase, parsed.data.email);
  if (!link.ok) {
    return { ok: false, error: link.error };
  }

  const { data: existing } = await supabase
    .from("admin_profiles")
    .select("password_set")
    .eq("user_id", link.userId)
    .maybeSingle();

  if (existing?.password_set) {
    return {
      ok: false,
      error:
        "That address already has admin access. Change their role or remove them from the Admins list instead.",
    };
  }
  const resent = Boolean(existing);

  const { error: upErr } = await supabase.from("admin_profiles").upsert(
    {
      user_id: link.userId,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
      password_set: false,
    },
    { onConflict: "user_id" },
  );
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const sent = await sendEmail({
    to: parsed.data.email,
    ...inviteEmail({
      url: link.url,
      inviterName: profile.full_name,
      role: parsed.data.role,
    }),
  });
  if (!sent.ok) {
    return {
      ok: false,
      error: `Profile created, but the invite email failed to send (${sent.error ?? "unknown"}). Use “Copy invite link” on their row in the Admins list and send it yourself.`,
    };
  }

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: link.userId,
    action: resent ? "invite_resend" : "invite",
    diff: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/admin/settings");
  return { ok: true, resent };
}

const PendingInviteInput = z.object({ userId: z.string().uuid() });

/**
 * Look up a pending invitee (profile row exists, no password yet) and mint a
 * fresh one-time link for them. Owner-only. Shared by resend + copy-link.
 */
async function pendingInviteLink(
  formData: FormData,
): Promise<
  | {
      ok: true;
      actorId: string;
      actorName: string | null;
      userId: string;
      email: string;
      role: string;
      url: string;
    }
  | { ok: false; error: string }
> {
  const { profile, user } = await requireAdmin();
  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can manage invites." };
  }
  const parsed = PendingInviteInput.safeParse({
    userId: formData.get("userId"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = getServiceSupabase();
  const { data: target } = await supabase
    .from("admin_profiles")
    .select("role, password_set")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Admin not found." };
  if (target.password_set) {
    return {
      ok: false,
      error:
        "This admin already has a password. They can sign in, or use “Email me a sign-in link” on the login page.",
    };
  }

  const { data: authUser, error: userErr } =
    await supabase.auth.admin.getUserById(parsed.data.userId);
  const email = authUser?.user?.email;
  if (userErr || !email) {
    return { ok: false, error: "Couldn't find that user's email." };
  }

  const link = await generateAdminSignInLink(supabase, email);
  if (!link.ok) return { ok: false, error: link.error };

  return {
    ok: true,
    actorId: user.id,
    actorName: profile.full_name,
    userId: parsed.data.userId,
    email,
    role: target.role,
    url: link.url,
  };
}

/** Email a pending admin a fresh invite link. Owner-only. */
export async function resendInvite(formData: FormData): Promise<ActionResult> {
  const pending = await pendingInviteLink(formData);
  if (!pending.ok) return pending;

  const sent = await sendEmail({
    to: pending.email,
    ...inviteEmail({
      url: pending.url,
      inviterName: pending.actorName,
      role: pending.role,
    }),
  });
  if (!sent.ok) {
    return {
      ok: false,
      error: `The invite email failed to send (${sent.error ?? "unknown"}). Use “Copy invite link” and send it yourself.`,
    };
  }

  logAudit({
    actor_id: pending.actorId,
    entity: "admin_profiles",
    entity_id: pending.userId,
    action: "invite_resend",
    diff: { email: pending.email },
  });
  return { ok: true };
}

/**
 * Return a fresh invite link for a pending admin so the owner can send it
 * through any channel (text message, a different mailbox) when email
 * delivery is the problem. Owner-only; one-time link, expires in an hour.
 */
export async function getInviteLink(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const pending = await pendingInviteLink(formData);
  if (!pending.ok) return pending;

  logAudit({
    actor_id: pending.actorId,
    entity: "admin_profiles",
    entity_id: pending.userId,
    action: "invite_link_copied",
    diff: { email: pending.email },
  });
  return { ok: true, url: pending.url };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

const ROLES = ["owner", "staff", "intake"] as const;

const RoleChangeInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES),
});

/** Count how many owners remain — used to protect the last owner. */
async function ownerCount(
  supabase: ReturnType<typeof getServiceSupabase>,
): Promise<number> {
  const { count } = await supabase
    .from("admin_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "owner");
  return count ?? 0;
}

/** Change an admin's role. Owner-only; the last owner can't be demoted. */
export async function changeAdminRole(
  formData: FormData,
): Promise<ActionResult> {
  const { profile, user } = await requireAdmin();
  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can change roles." };
  }

  const parsed = RoleChangeInput.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const supabase = getServiceSupabase();
  const { data: target } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Admin not found." };

  if (target.role === "owner" && parsed.data.role !== "owner") {
    if ((await ownerCount(supabase)) <= 1) {
      return { ok: false, error: "Can't demote the last owner." };
    }
  }

  const { error } = await supabase
    .from("admin_profiles")
    .update({ role: parsed.data.role })
    .eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: parsed.data.userId,
    action: "role_change",
    diff: { from: target.role, to: parsed.data.role },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

const RemoveInput = z.object({ userId: z.string().uuid() });

/** Revoke an admin's access (deletes the admin_profiles row; the auth user
 *  remains but can no longer reach /admin). Owner-only; can't remove
 *  yourself or the last owner. */
export async function removeAdmin(formData: FormData): Promise<ActionResult> {
  const { profile, user } = await requireAdmin();
  if (profile.role !== "owner") {
    return { ok: false, error: "Only owners can remove admins." };
  }

  const parsed = RemoveInput.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  if (parsed.data.userId === user.id) {
    return { ok: false, error: "You can't remove yourself." };
  }

  const supabase = getServiceSupabase();
  const { data: target } = await supabase
    .from("admin_profiles")
    .select("role")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();
  if (!target) return { ok: false, error: "Admin not found." };
  if (target.role === "owner" && (await ownerCount(supabase)) <= 1) {
    return { ok: false, error: "Can't remove the last owner." };
  }

  const { error } = await supabase
    .from("admin_profiles")
    .delete()
    .eq("user_id", parsed.data.userId);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: parsed.data.userId,
    action: "remove",
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

const PasswordInput = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Passwords can be at most 72 characters");

/**
 * Set or change the signed-in admin's password. Used by /onboarding (first
 * sign-in and password reset) and the Security card in settings.
 */
export async function setPassword(formData: FormData): Promise<ActionResult> {
  // allowUnonboarded: this is the action the /onboarding page calls, so the
  // caller is (by definition) a user who hasn't set a password yet — don't
  // bounce them back to onboarding before they can complete it.
  const { user } = await requireAdmin({ allowUnonboarded: true });

  const parsed = PasswordInput.safeParse(formData.get("password"));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const confirm = formData.get("confirm");
  if (confirm !== parsed.data) {
    return { ok: false, error: "Passwords don't match." };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    return { ok: false, error: error.message };
  }

  // Mark onboarding complete (so requireAdmin stops sending them to
  // /onboarding) via the service-role client to bypass RLS on admin_profiles.
  const admin = getServiceSupabase();
  await admin
    .from("admin_profiles")
    .update({ password_set: true })
    .eq("user_id", user.id);

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: user.id,
    action: "set_password",
  });

  return { ok: true };
}

/** Sign the user out everywhere except this browser. */
export async function signOutOtherDevices(): Promise<ActionResult> {
  const { user } = await requireAdmin();
  // Revoke every other session for this user; the current browser stays
  // signed in. Anyone else holding a session has to sign in again.
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) return { ok: false, error: error.message };
  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: user.id,
    action: "sign_out_others",
  });
  return { ok: true };
}

const DisplayNameInput = z
  .string()
  .trim()
  .min(2, "Use at least 2 characters")
  .max(100);

/**
 * Update the signed-in admin's own display name. This is the name shown on
 * assignee chips, the activity feed, and lead notes. Any admin can edit their
 * own; no role gate (it's only your own row, enforced by user_id match).
 */
export async function updateOwnDisplayName(
  formData: FormData,
): Promise<ActionResult> {
  const { user } = await requireAdmin();

  const parsed = DisplayNameInput.safeParse(formData.get("full_name"));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid name",
    };
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("admin_profiles")
    .update({ full_name: parsed.data })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: user.id,
    action: "update_name",
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
