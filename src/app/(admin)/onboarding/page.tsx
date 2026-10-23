import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import PasswordForm from "@/components/admin/password-form";

export const metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ reset?: string }> };

/**
 * The one "choose a password" page. Every one-time link (invite, re-sent
 * invite, sign-in link) lands here after /auth/callback signs the admin in:
 *
 * - An admin with no password yet (invite not completed) sees the welcome
 *   copy. requireAdmin() sends them here from anywhere in /admin until they
 *   finish, so the step can't be skipped.
 * - An admin who already has a password only gets here through a sign-in
 *   link (`?reset=1`); they choose a new password. Without `?reset=1` they
 *   are sent on to /admin.
 */
export default async function OnboardingPage({ searchParams }: Props) {
  const { reset } = await searchParams;
  // allowUnonboarded so this page doesn't bounce the very user it's meant for.
  const { profile } = await requireAdmin({ allowUnonboarded: true });
  if (profile.password_set && !reset) redirect("/admin");

  const firstRun = !profile.password_set;
  return (
    <main className="bg-secondary/40 flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm">
        <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
          MMG Law Firm
        </p>
        <h1 className="font-display mt-3 text-2xl font-medium tracking-tight">
          {firstRun ? "Set your password" : "Choose a new password"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {firstRun
            ? `Welcome${profile.full_name ? `, ${profile.full_name}` : ""}. You're signed in. Create a password to finish setting up your account; from then on you sign in with your email and this password.`
            : "You're signed in through your link. Pick a new password to finish; your old one stops working."}
        </p>
        <PasswordForm
          idPrefix="onboarding"
          className="mt-6 grid gap-3"
          submitLabel="Set password & continue"
          redirectTo="/admin"
        />
      </div>
    </main>
  );
}
