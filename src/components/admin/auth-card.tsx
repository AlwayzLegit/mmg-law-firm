import type { ReactNode } from "react";

/** Shared frame for the sign-in, forgot/reset-password and account-setup pages. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="bg-secondary/40 flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="border-border bg-card w-full max-w-md rounded-2xl border p-8 shadow-sm">
        <p className="text-primary text-xs font-medium tracking-[0.18em] uppercase">
          MMG Law Firm
        </p>
        <h1 className="font-display mt-3 text-2xl font-medium tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
        ) : null}
        {children}
      </div>
    </main>
  );
}
