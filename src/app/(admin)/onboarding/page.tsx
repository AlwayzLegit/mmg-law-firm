import { redirect } from "next/navigation";

import { AuthSplit } from "@/components/admin/auth-split";
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
    <AuthSplit>
      <p className="text-gold-deep m-0 text-xs font-semibold tracking-[0.16em] uppercase">Welcome · set your password</p>
      <div className="bg-ink/8 mt-2.5 h-[3px] overflow-hidden rounded-sm">
        <div className="bg-gold h-full w-1/2" />
      </div>
      <h2 className="font-display mt-5 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">Set your password</h2>
      <p className="text-stone mt-1.5 text-[13.5px]">
        Welcome{profile.full_name ? `, ${profile.full_name}` : ""}. Create a password to finish setting up your account.
        Next time you can sign in with your email and password — no one-time link needed.
      </p>
      <OnboardingForm />
    </AuthSplit>
  );
}
