import Link from "next/link";

import LoginForm from "./login-form";
import AuthCard from "@/components/admin/auth-card";

export const metadata = {
  title: "Admin Login",
  description: "MMG Law Firm administrator sign-in.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string; reset?: string }>;
};

const ERRORS: Record<string, string> = {
  "not-admin":
    "This account isn't authorized for the admin. Contact the firm owner to request access.",
  "auth-failed":
    "That link has expired or was already used. Request a new one below.",
  "missing-code":
    "That link was incomplete. Open it again from the email, or request a new one below.",
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error
    ? (ERRORS[params.error] ?? "Something went wrong. Please try again.")
    : null;
  const notice = params.reset
    ? "Your password has been updated. Sign in with your new password."
    : null;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Enter your email and password to open the admin."
    >
      {notice ? (
        <div className="mt-5 rounded-md border border-success/40 bg-success/10 p-3 text-xs text-foreground">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {error}{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Reset password
          </Link>
        </div>
      ) : null}

      <LoginForm next={params.next} />

      <p className="mt-5 text-center text-xs text-muted-foreground">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthCard>
  );
}
