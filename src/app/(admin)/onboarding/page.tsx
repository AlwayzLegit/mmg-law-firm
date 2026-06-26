import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";

import OnboardingForm from "./onboarding-form";

export const metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

/**
 * First-run onboarding. A newly invited admin lands here after signing in via
 * the invite link (requireAdmin redirects them when `password_set` is false).
 * They set a password once; afterward they sign in with email + password and
 * no longer depend on a one-time link every visit.
 */
export default async function OnboardingPage() {
  // allowUnonboarded so this page doesn't bounce the very user it's meant for.
  const { profile } = await requireAdmin({ allowUnonboarded: true });
  if (profile.password_set) redirect("/admin");

  return (
    <main className="bg-secondary/40 flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm">
        <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
          MMG Law Firm
        </p>
        <h1 className="font-display mt-3 text-2xl font-medium tracking-tight">
          Set your password
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Welcome{profile.full_name ? `, ${profile.full_name}` : ""}. Create a
          password to finish setting up your account. Next time you can sign in
          with your email and password — no one-time link needed.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
