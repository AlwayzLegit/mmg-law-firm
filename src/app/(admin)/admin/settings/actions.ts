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
