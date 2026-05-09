"use client";

import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("App error:", error);
    }
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Something went wrong
      </p>
      <h1 className="mt-4 max-w-xl font-display text-3xl font-medium tracking-tight md:text-4xl">
        We hit a problem loading this page.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Please try again. If the issue persists, call our office directly and
        we&apos;ll help you right away.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} size="lg">
          Try again
        </Button>
        <a
          href={`tel:${FIRM.phoneTel}`}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Call {FIRM.phone}
        </a>
      </div>
    </section>
  );
}
