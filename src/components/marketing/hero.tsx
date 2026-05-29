import Link from "next/link";
import {
  ArrowRight,
  Award,
  Clock,
  Globe2,
  Phone,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
};

export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-border",
        className,
      )}
    >
      {/* Layered background: warm wash + soft radial + subtle grid */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 75% 20%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-72 bg-[linear-gradient(to_right,rgba(43,70,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(43,70,216,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}
      />

      <div className="container-page py-14 md:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionEyebrow>Attorney Advertising</SectionEyebrow>

            <h1 className="mt-5 max-w-[18ch] font-display text-[2.6rem] font-medium leading-[1.04] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              When the unexpected happens,
              <span className="block text-primary">
                the call you make next matters.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground">
              {FIRM.legalName} represents Californians injured in car, truck,
              motorcycle, pedestrian, bicycle, rideshare, and slip-and-fall
              accidents. Free consultation. No fee unless we win your case.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ size: "marketing" }),
                  "group/cta",
                )}
              >
                <span>Request Free Consultation</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
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

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
              <InlineSignal icon={ShieldCheck}>
                No fee unless we win
              </InlineSignal>
              <InlineSignal icon={Globe2}>
                Counsel in {FIRM.languages.join(", ")}
              </InlineSignal>
              <InlineSignal icon={Award}>
                {FIRM.attorneyName} handles your case directly
              </InlineSignal>
            </div>
          </div>

          <CredentialsCard />
        </div>
      </div>
    </section>
  );
}

function InlineSignal({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="text-foreground">{children}</span>
    </span>
  );
}

/**
 * The "object" anchoring the hero: a layered consultation card with the
 * firm's identity, contact details, and credentials. Looks like something
 * pinned to a leather-bound dossier — confident, plate-style.
 */
function CredentialsCard() {
  return (
    <div className="relative">
      {/* offset shadow card behind */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-primary/10"
      />
      <article className="relative rounded-2xl border border-border bg-card p-7 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_30px_60px_-30px_rgba(20,30,80,0.35)] backdrop-blur md:p-8">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-success">
            Free consultation
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            CA Bar #{FIRM.barNumber}
          </span>
        </div>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Speak directly with
        </p>
        <p className="mt-1 font-display text-2xl font-medium tracking-tight text-foreground">
          {FIRM.attorneyName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Founder · Personal-injury counsel · California
        </p>

        <a
          href={`tel:${FIRM.phoneTel}`}
          className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-secondary/40"
        >
          <span className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Phone className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Call directly
              </span>
              <span className="block font-display text-lg font-semibold tracking-tight">
                {FIRM.phone}
              </span>
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 text-muted-foreground"
            aria-hidden
          />
        </a>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <Pill icon={Clock}>{FIRM.hours}</Pill>
          <Pill icon={Scale}>Statewide CA</Pill>
        </div>

        <div className="mt-5 border-t border-dashed border-border pt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Languages
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FIRM.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-foreground">
      <Icon className="h-3.5 w-3.5 flex-none text-primary" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}
