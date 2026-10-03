import { AuthSplit } from "@/components/admin/auth-split";
import { FIRM } from "@/lib/constants";

import LoginForm from "./login-form";

export const metadata = {
  title: "Admin Login",
  description: "MMG Law Firm administrator sign-in.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string; verify?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <AuthSplit>
      <h2 className="font-display text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">Sign in</h2>
      <p className="text-stone mt-1.5 text-[13.5px]">Admins only. Use your firm email.</p>

      {params.error ? (
        <div className="mt-5 rounded-[10px] border border-[#b91c1c]/30 bg-[rgba(220,38,38,.08)] p-3 text-xs text-[#b91c1c]">
          {params.error === "not-admin"
            ? "Your account isn't authorized for admin. Contact the firm owner to request access."
            : params.error === "auth-failed"
              ? "That sign-in link didn't work — it may have expired or been used already. Request a new one below."
              : params.error === "missing-code"
                ? "The sign-in link was missing a code. Try again with a fresh link."
                : "Something went wrong. Please try again."}
        </div>
      ) : null}

      {params.verify ? (
        <div className="bg-gold/12 border-gold/40 mt-5 rounded-[10px] border p-3 text-xs">
          This device needs to be verified. Sign in to receive a one-time code.
        </div>
      ) : null}

      <LoginForm next={params.next} verify={Boolean(params.verify)} />

      <p className="text-stone mt-5 text-xs">
        Sign-ins are rate-limited and recorded in the audit log. Problems signing in? Call the office at {FIRM.phone}.
      </p>
    </AuthSplit>
  );
}
