import { redirect } from "next/navigation";

import AuthCard from "@/components/admin/auth-card";
import PasswordForm from "@/components/admin/password-form";
import { requireAdmin } from "@/lib/auth/require-admin";

export const metadata = {
  title: "Set up your account",
  robots: { index: false, follow: false },
};

/**
 * Account set-up for a newly invited admin. The invite email's link lands
 * here after /auth/callback signs them in; they choose a password and go on
 * to /admin. requireAdmin() sends any admin without a password here from
 * anywhere in /admin, so the step can't be skipped. An admin who already
 * has a password is sent straight to /admin.
 *
 * Password resets do not use this page; see /reset-password.
 */
export default async function OnboardingPage() {
  // allowUnonboarded so this page doesn't bounce the very user it's meant for.
  const { profile, user } = await requireAdmin({ allowUnonboarded: true });
  if (profile.password_set) redirect("/admin");

  return (
    <AuthCard
      title="Set up your account"
      subtitle={
        <>
          Welcome{profile.full_name ? `, ${profile.full_name}` : ""}. Choose a
          password for <span className="font-medium">{user.email}</span>.
          You&apos;ll use it with your email to sign in from now on.
        </>
      }
    >
      <PasswordForm
        idPrefix="onboarding"
        className="mt-6 grid gap-3"
        submitLabel="Save password & continue"
        redirectTo="/admin"
      />
    </AuthCard>
  );
}
