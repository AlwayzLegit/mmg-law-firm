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
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary/40 px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          MMG Law Firm
        </p>
        <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
          Sign in to admin
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and password. A new device also needs a one-time
          code we email you. Only authorized firm staff have access.
        </p>

        {params.error ? (
          <div className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
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
          <div className="mt-5 rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
            This device needs to be verified. Sign in to receive a one-time
            code.
          </div>
        ) : null}

        <LoginForm next={params.next} verify={Boolean(params.verify)} />
      </div>
    </main>
  );
}
