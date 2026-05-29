"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { siteUrl } from "@/lib/seo/canonical";
import { getServiceSupabase } from "@/lib/supabase/admin";
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
