"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { revokeAllDevices, trustCurrentDevice } from "@/lib/auth/device-trust";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/leads/intake";
import { FIRM } from "@/lib/constants";

const InviteInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(["owner", "staff", "intake"]),
});

export type InviteResult = { ok: true } | { ok: false; error: string };

/**
 * Generate a sign-in link for an admin invite.
 *
 * We use `admin.generateLink` (not `inviteUserByEmail`) because we send the
 * email ourselves via Resend and, crucially, build a `token_hash` link that
 * /auth/callback verifies with `verifyOtp`. That works for a brand-new user
 * with no prior browser state — unlike the PKCE `?code=` flow, whose verifier
 * cookie the invitee never has, which is why the old invite produced the
 * "sign-in link was missing a code" error.
 *
 * `invite` creates the auth user if absent; if they already exist (a re-send),
 * fall back to `magiclink`, which signs the existing user in.
 */
async function generateAdminSignInLink(
  supabase: ReturnType<typeof getServiceSupabase>,
  email: string,
): Promise<
  | { ok: true; userId: string; url: string }
  | { ok: false; error: string }
> {
  const next = encodeURIComponent("/admin");

  async function linkFor(type: "invite" | "magiclink") {
    const { data, error } = await supabase.auth.admin.generateLink({
      type,
      email,
    });
    if (error || !data.user || !data.properties?.hashed_token) {
      return { data: null, error };
    }
    const url = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(
      data.properties.hashed_token,
    )}&type=${type}&next=${next}`;
    return { data: { userId: data.user.id, url }, error: null };
  }

  let res = await linkFor("invite");
  // Already-registered users can't be re-invited; sign them in instead.
  if (!res.data && /registered|already|exist/i.test(res.error?.message ?? "")) {
    res = await linkFor("magiclink");
  }
  if (!res.data) {
    return { ok: false, error: res.error?.message ?? "Couldn't create invite." };
  }
  return { ok: true, ...res.data };
}

/**
 * Invite a new admin user. Only existing owners can invite.
 *
 * Generates a token_hash sign-in link, upserts an admin_profiles row binding
 * the user to a role, then emails the link via Resend. The new user lands at
 * /auth/callback after clicking, which verifies the link and signs them in.
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

  const { error: upErr } = await supabase.from("admin_profiles").upsert(
    {
      user_id: link.userId,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
    },
    { onConflict: "user_id" },
  );
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const sent = await sendEmail({
    to: parsed.data.email,
    subject: `You've been invited to the ${FIRM.legalName} admin`,
    html: `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="margin: 0 0 12px;">You're invited to ${FIRM.legalName}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #444;">
          ${escapeHtml(profile.full_name ?? "An administrator")} has invited you
          to the ${FIRM.legalName} admin as
          <strong>${parsed.data.role}</strong>. Click the button below to sign in
          and get started.
        </p>
        <p style="margin: 24px 0;">
          <a href="${link.url}" style="display: inline-block; background: #2b46d8; color: #fff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600; font-size: 14px;">
            Accept invite &amp; sign in
          </a>
        </p>
        <p style="font-size: 12px; line-height: 1.6; color: #888;">
          This link signs you in and verifies this device. It expires after a
          short time — if it stops working, ask the person who invited you to
          resend it. If you weren't expecting this, you can ignore this email.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #aaa;">${FIRM.legalName}</p>
      </div>
    `,
  });
  if (!sent.ok) {
    return {
      ok: false,
      error: `Profile created, but the invite email failed to send (${sent.error ?? "unknown"}). You can resend from this page.`,
    };
  }

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: link.userId,
    action: "invite",
    diff: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
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
 * Set or change the signed-in admin's password. After this, the admin can use
 * password login instead of the magic link (new devices still need the code).
 */
export async function setPassword(formData: FormData): Promise<ActionResult> {
  const { user } = await requireAdmin();

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

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: user.id,
    action: "set_password",
  });

  return { ok: true };
}

/**
 * Forget every remembered device, then re-trust the current one. Other devices
 * will need the email code again on their next sign-in.
 */
export async function signOutOtherDevices(): Promise<ActionResult> {
  const { user } = await requireAdmin();
  await revokeAllDevices(user.id);
  await trustCurrentDevice(user.id);
  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: user.id,
    action: "revoke_devices",
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
