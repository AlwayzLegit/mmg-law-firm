import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  heading?: string;
  body?: string;
  className?: string;
};

export function CtaBand({
  heading = "Ready to talk?",
  body = "Free consultation. Bilingual counsel. No fee unless we win your case.",
  className,
}: Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-y border-border",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(120deg, var(--color-brand-700) 0%, var(--color-brand-500) 55%, var(--color-brand-700) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container-page flex flex-col items-start justify-between gap-8 py-20 md:flex-row md:items-center md:py-28">
        <div className="max-w-2xl text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-gold-300)]">
            Free consultation
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 text-primary-foreground/85">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ variant: "secondary", size: "marketing" }),
              "group/cta bg-primary-foreground text-primary hover:bg-primary-foreground",
            )}
          >
            <span>Request consultation</span>
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "marketing" }),
              "border-primary-foreground/30 bg-transparent text-primary-foreground hover:border-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{FIRM.phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
