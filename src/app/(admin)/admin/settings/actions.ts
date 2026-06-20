"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import { revokeAllDevices, trustCurrentDevice } from "@/lib/auth/device-trust";
import { logAudit } from "@/lib/audit";

const InviteInput = z.object({
  email: z.string().trim().email("Enter a valid email"),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(["owner", "staff", "intake"]),
});

export type InviteResult = { ok: true } | { ok: false; error: string };

/**
 * Invite a new admin user. Only existing owners can invite.
 *
 * Calls Supabase admin API to create-or-find the auth user and dispatch a
 * magic link, then upserts an admin_profiles row binding the user to a
 * role. The new user lands at /auth/callback after clicking the link.
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

  const { data: invite, error: inviteErr } =
    await supabase.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/admin`,
    });
  if (inviteErr || !invite.user) {
    return {
      ok: false,
      error: inviteErr?.message ?? "Couldn't send invite.",
    };
  }

  const { error: upErr } = await supabase
    .from("admin_profiles")
    .upsert(
      {
        user_id: invite.user.id,
        role: parsed.data.role,
        full_name: parsed.data.full_name,
      },
      { onConflict: "user_id" },
    );
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  logAudit({
    actor_id: user.id,
    entity: "admin_profiles",
    entity_id: invite.user.id,
    action: "invite",
    diff: { email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}

export type ActionResult = { ok: true } | { ok: false; error: string };

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
