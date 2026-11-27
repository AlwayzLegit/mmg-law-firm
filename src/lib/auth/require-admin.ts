import { cache } from "react";
import { redirect } from "next/navigation";

import { authProvider } from "@/lib/auth/provider";
import { getSessionUser, signOut } from "@/lib/auth/session";
import { getServiceSupabase } from "@/lib/supabase/admin";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminProfile = {
  user_id: string;
  role: "owner" | "staff" | "intake";
  full_name: string | null;
  /** False until the admin sets a password (first-run onboarding). When false,
   *  requireAdmin sends them to /onboarding so the next sign-in can be a
   *  plain email + password. */
  password_set: boolean;
};

/**
 * Server-side admin gate. Use at the top of any /admin server component.
 * Redirects to /login when no session, or signs out and bounces when the
 * user is signed in but has no `admin_profiles` row.
 *
 * Does NOT short-circuit when Supabase is unconfigured — proxy.ts already
 * redirects /admin/* to /login in that case. Reaching this code path with
 * unconfigured env means proxy was bypassed; we redirect again defensively.
 *
 * `allowUnonboarded`: the /onboarding page itself needs the same identity
 * check but must NOT bounce the user back to onboarding (that would loop).
 */
export const requireAdmin = cache(async function requireAdmin(opts?: {
  allowUnonboarded?: boolean;
}): Promise<{
  user: { id: string; email: string | null };
  profile: AdminProfile;
}> {
  const betterAuth = authProvider() === "better-auth";
  if (!betterAuth && !isSupabaseConfigured()) {
    redirect("/login");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  // With Supabase the profile is read as the signed-in user (row-level
  // security lets them read their own row). Better Auth has no database
  // identity, so the profile is read with the service client; the session
  // above already proved who this is (OPS-365).
  const supabase = betterAuth ? getServiceSupabase() : await getServerSupabase();
  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("user_id, role, full_name, password_set")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    // Signed in but not an admin — sign out and bounce them.
    await signOut();
    redirect("/login?error=not-admin");
  }

  // First-run onboarding: a user who arrived through an invite link and never
  // set a password is sent to /onboarding to set one.
  if (!opts?.allowUnonboarded && !profile.password_set) {
    redirect("/onboarding");
  }

  return {
    user: { id: user.id, email: user.email },
    profile: profile as AdminProfile,
  };
});

/** Owners and staff edit content and firm settings; intake reads them only. */
export function canEdit(role: AdminProfile["role"]): boolean {
  return role !== "intake";
}

/**
 * requireAdmin() for server actions that change content, media or firm
 * settings. Intake accounts are read-only outside leads ("intake — read leads
 * only" on the invite form), and these actions mostly write with the service
 * role, so RLS alone can't enforce that. The UI disables the controls for
 * intake; this throws only on a crafted request.
 */
export async function requireEditor(): Promise<
  Awaited<ReturnType<typeof requireAdmin>>
> {
  const admin = await requireAdmin();
  if (!canEdit(admin.profile.role)) {
    throw new Error("Intake accounts can't change content or settings.");
  }
  return admin;
}
