import { redirect } from "next/navigation";

import AuthCard from "@/components/admin/auth-card";
import PasswordForm from "@/components/admin/password-form";
import { getServerSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

/**
 * Landing page for the password-reset email. /auth/callback has already
 * verified the recovery link and signed the admin in; here they choose the
 * new password and are sent to /login to sign in with it.
 *
 * Reached without a session (link expired, opened twice, typed by hand) it
 * sends them back to /login with the "link expired" notice.
 */
export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) redirect("/login");
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=auth-failed");

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Your old password stops working as soon as you save the new one."
    >
      <PasswordForm
        idPrefix="reset"
        className="mt-6 grid gap-3"
        submitLabel="Save new password"
        redirectTo="/login?reset=1"
        signOutAfter
      />
    </AuthCard>
  );
}
