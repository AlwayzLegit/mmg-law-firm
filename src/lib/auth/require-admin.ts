import { redirect } from "next/navigation";

import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";
import { isDeviceTrusted } from "@/lib/auth/device-trust";

export type AdminProfile = {
  user_id: string;
  role: "owner" | "staff" | "intake";
  full_name: string | null;
  /** False until the admin sets a password (first-run onboarding). When false,
   *  requireAdmin sends them to /onboarding so they stop depending on email
   *  links for every sign-in. */
  password_set: boolean;
};

/**
 * Server-side admin gate. Use at the top of any /admin server component.
 * Redirects to /login when no session, or 403 when the user is signed in
 * but missing an `admin_profiles` row.
 *
 * Does NOT short-circuit when Supabase is unconfigured — proxy.ts already
 * redirects /admin/* to /login in that case. Reaching this code path with
 * unconfigured env means proxy was bypassed; we redirect again defensively.
 *
 * `allowUnonboarded`: the /onboarding page itself needs the same identity +
 * device checks but must NOT bounce the user back to onboarding (that would
 * loop). It passes this flag to skip only the password-set redirect.
 */
export async function requireAdmin(opts?: {
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

  // Second factor: even with a valid session, an unverified device can't reach
  // admin. The login flow emails a one-time code (or link) to verify it; the
  // magic-link callback and code verification both mark the device trusted.
  if (!(await isDeviceTrusted(user.id))) {
    redirect("/login?verify=1");
  }

  // First-run onboarding: a user who signed in via an invite/magic link but
  // never set a password is sent to /onboarding to set one — so they can use
  // email + password next time instead of a fresh link every visit.
  if (!opts?.allowUnonboarded && !profile.password_set) {
    redirect("/onboarding");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile as AdminProfile,
  };
}
