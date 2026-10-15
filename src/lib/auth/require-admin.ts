import { cache } from "react";
import { redirect } from "next/navigation";

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
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("user_id, role, full_name, password_set")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    // Signed in but not an admin — sign out and bounce them.
    await supabase.auth.signOut();
    redirect("/login?error=not-admin");
  }

  // First-run onboarding: a user who arrived through an invite link and never
  // set a password is sent to /onboarding to set one.
  if (!opts?.allowUnonboarded && !profile.password_set) {
    redirect("/onboarding");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile as AdminProfile,
  };
});
