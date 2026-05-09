import { redirect } from "next/navigation";

import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminProfile = {
  user_id: string;
  role: "owner" | "staff" | "intake";
  full_name: string | null;
};

/**
 * Server-side admin gate. Use at the top of any /admin server component.
 * Redirects to /login when no session, or 403 when the user is signed in
 * but missing an `admin_profiles` row.
 *
 * Does NOT short-circuit when Supabase is unconfigured — proxy.ts already
 * redirects /admin/* to /login in that case. Reaching this code path with
 * unconfigured env means proxy was bypassed; we redirect again defensively.
 */
export async function requireAdmin(): Promise<{
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
    .select("user_id, role, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    // Signed in but not an admin — sign out and bounce them.
    await supabase.auth.signOut();
    redirect("/login?error=not-admin");
  }

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile as AdminProfile,
  };
}
