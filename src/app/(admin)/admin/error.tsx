"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Admin-scoped error boundary. Tags the Sentry report with section:"admin"
 * so dashboard/CRM failures are easy to triage separately from public-site
 * errors, and renders a plain in-app recovery UI (no marketing chrome).
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { section: "admin" } });
    if (process.env.NODE_ENV !== "production") {
      console.error("Admin error:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-primary text-xs font-semibold tracking-[0.22em] uppercase">
        Admin error
      </p>
      <h1 className="font-display mt-4 text-2xl font-medium tracking-tight">
        Something went wrong loading this view.
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm">
        The error has been logged. Try again, or head back to the dashboard.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Reference:{" "}
          <code className="text-foreground font-mono">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} size="sm" className="gap-2">
          <RotateCcw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
        <Link
          href="/admin"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
