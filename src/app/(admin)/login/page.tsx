import LoginForm from "./login-form";

export const metadata = {
  title: "Admin Login",
  description: "MMG Law Firm administrator sign-in.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

const ERRORS: Record<string, string> = {
  "not-admin":
    "Your account isn't authorized for admin. Contact the firm owner to request access.",
  "auth-failed":
    "That link didn't work. It may have expired or been used already. Use “Forgot password” to get a new one, or ask the owner to resend your invite.",
  "missing-code":
    "That link was incomplete. Open it again from the email, or request a new one.",
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params.error
    ? (ERRORS[params.error] ?? "Something went wrong. Please try again.")
    : null;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          MMG Law Firm
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          Sign in to admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and password. Only authorized firm staff have
          access.
        </p>

        {error ? (
          <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <LoginForm next={params.next} />
      </div>
    </main>
  );
}
