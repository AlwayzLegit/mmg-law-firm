import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Page Not Found",
  description: "We could not find the page you were looking for.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(to_right,rgba(43,70,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(43,70,216,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
            style={{
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
            }}
          />

          <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
            <p
              aria-hidden
              className="font-display text-[8rem] font-medium leading-none tracking-tighter text-primary/15 md:text-[12rem]"
            >
              404
            </p>
            <p className="-mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="block h-px w-8 bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-[var(--color-gold-500)]" />
              Page not found
            </p>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              We couldn&apos;t find that page.
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              The link may be outdated, or the page has moved. If you&apos;re
              trying to reach our office, the fastest way is by phone.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className={cn(
                  buttonVariants({ size: "marketing" }),
                  "group/cta",
                )}
              >
                <ArrowLeft
                  className="h-4 w-4 transition-transform group-hover/cta:-translate-x-0.5"
                  aria-hidden
                />
                <span>Return home</span>
              </Link>
              <a
                href={`tel:${FIRM.phoneTel}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "marketing" }),
                )}
              >
                <Phone className="h-4 w-4 text-primary" aria-hidden />
                <span>Call {FIRM.phone}</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
