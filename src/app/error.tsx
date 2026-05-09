"use client";

import { useEffect } from "react";
import { Phone, RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
    <section className="relative isolate flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />

      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        <span className="block h-px w-8 bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-[var(--color-gold-500)]" />
        Something went wrong
      </p>
      <h1 className="mt-5 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">
        We hit a problem loading this page.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        Please try again. If the issue persists, call our office directly and
        we&apos;ll help you right away.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Reference:{" "}
          <code className="font-mono text-foreground">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={() => reset()}
          size="marketing"
          className="group/cta gap-2"
        >
          <RotateCcw
            className="h-4 w-4 transition-transform group-hover/cta:-rotate-12"
            aria-hidden
          />
          <span>Try again</span>
        </Button>
        <a
          href={`tel:${FIRM.phoneTel}`}
          className={cn(buttonVariants({ variant: "outline", size: "marketing" }))}
        >
          <Phone className="h-4 w-4 text-primary" aria-hidden />
          <span>Call {FIRM.phone}</span>
        </a>
      </div>
    </section>
  );
}
