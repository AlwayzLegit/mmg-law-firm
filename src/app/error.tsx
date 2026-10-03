"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Phone, RotateCcw } from "lucide-react";

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
    // Report to Sentry. Without this, page-level errors caught here never
    // reach Sentry (only the root global-error boundary did) — so most real
    // route errors were going unreported.
    Sentry.captureException(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("App error:", error);
    }
  }, [error]);

  return (
    <section className="surface-ink bg-background text-foreground relative isolate flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,163,90,.18),transparent_60%)]"
      />

      <p className="text-gold inline-flex items-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase">
        <span aria-hidden className="bg-gold block h-px w-6" />
        Something went wrong
        <span aria-hidden className="bg-gold block h-px w-6" />
      </p>
      <h1 className="text-cream mt-5 max-w-2xl text-[clamp(30px,4vw,48px)] leading-[1.05] font-semibold tracking-[-0.02em]">
        We hit a problem loading this page.
      </h1>
      <p className="text-cream/72 mt-4 max-w-md text-[16.5px]">
        Please try again. If the issue persists, call our office directly and
        we&apos;ll help you right away.
      </p>
      {error.digest ? (
        <p className="text-cream/55 mt-3 text-xs">
          Reference: <code className="text-cream font-mono">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} variant="gold" size="pill" className="group/cta gap-2">
          <RotateCcw
            className="h-4 w-4 transition-transform group-hover/cta:-rotate-12"
            aria-hidden
          />
          <span>Try again</span>
        </Button>
        <a
          href={`tel:${FIRM.phoneTel}`}
          className={buttonVariants({ variant: "outline-cream", size: "pill" })}
        >
          <Phone className="h-[15px] w-[15px]" aria-hidden />
          <span>Call {FIRM.phone}</span>
        </a>
      </div>
    </section>
  );
}
