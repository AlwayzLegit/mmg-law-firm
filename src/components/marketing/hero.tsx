import Link from "next/link";
import Image from "next/image";
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
import { ATTORNEY_IMAGES, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
};

export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn(
        "border-border relative isolate overflow-hidden border-b",
        className,
      )}
    >
      {/* Layered background: warm wash + ambient gradient orbs + grid */}
      <div className="from-secondary/70 via-background to-background absolute inset-0 -z-10 bg-gradient-to-b" />
      {/* Primary gradient orb — top right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 -z-10 h-[640px] w-[640px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-primary) 22%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Gold accent orb — left mid */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-40 -z-10 h-[480px] w-[480px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--color-gold-500) 28%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Subtle grid — fades into the page */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[480px] bg-[linear-gradient(to_right,rgba(43,70,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(43,70,216,0.06)_1px,transparent_1px)] bg-[size:36px_36px]"
        style={{
          maskImage:
            "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.7), transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.7), transparent 70%)",
        }}
      />

      <div className="container-page py-14 md:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16">
          <div>
            <SectionEyebrow>Attorney Advertising</SectionEyebrow>

            <h1 className="font-display text-foreground mt-5 max-w-[18ch] text-[2.6rem] leading-[1.04] font-medium tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              Focus on your recovery
              <span className="text-primary block">
                while we fight for you.
              </span>
            </h1>

            <p className="text-muted-foreground mt-7 max-w-xl text-lg leading-relaxed">
              Have you been injured in an accident because someone else was
              negligent or careless? You may be entitled to compensation.{" "}
              {FIRM.attorneyName} at {FIRM.legalName} represents personal-injury
              clients across California — and we will fight to help you get the
              money you need and deserve.
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
                <Phone className="text-primary h-4 w-4" aria-hidden />
                <span>Call {FIRM.phone}</span>
              </a>
            </div>

            <div className="text-muted-foreground mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
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
      <span className="bg-primary/10 text-primary inline-flex h-6 w-6 flex-none items-center justify-center rounded-md">
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
      {/* Offset gold "plate" sibling — the signature card object. */}
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/25"
      />
      <article className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_30px_60px_-30px_rgba(20,30,80,0.35)] backdrop-blur">
        <div className="bg-secondary relative aspect-[5/4] w-full overflow-hidden">
          <Image
            src={mediaUrl(ATTORNEY_IMAGES.portrait)}
            alt={`${FIRM.attorneyName}, founder and managing attorney of ${FIRM.legalName}`}
            fill
            priority
            sizes="(min-width: 1024px) 480px, (min-width: 768px) 60vw, 100vw"
            className="object-cover object-top"
          />
          <div
            aria-hidden
            className="from-card via-card/70 absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t to-transparent"
          />
        </div>

        <div className="px-7 pt-2 pb-7 md:px-8 md:pb-8">
          <div className="flex items-center justify-between">
            <span className="bg-success/10 text-success rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider uppercase">
              Free consultation
            </span>
            <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
              CA Bar #{FIRM.barNumber}
            </span>
          </div>

          <p className="text-muted-foreground mt-6 text-xs font-medium tracking-[0.18em] uppercase">
            Speak directly with
          </p>
          <p className="font-display text-foreground mt-1 text-2xl font-medium tracking-tight">
            {FIRM.attorneyName}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Founder · Personal-injury counsel · California
          </p>

          <a
            href={`tel:${FIRM.phoneTel}`}
            className="border-border bg-background hover:border-primary/40 hover:bg-secondary/40 mt-6 flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground inline-flex h-9 w-9 items-center justify-center rounded-lg">
                <Phone className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="text-muted-foreground block text-[11px] font-medium tracking-[0.18em] uppercase">
                  Call directly
                </span>
                <span className="font-display block text-lg font-semibold tracking-tight">
                  {FIRM.phone}
                </span>
              </span>
            </span>
            <ArrowRight className="text-muted-foreground h-4 w-4" aria-hidden />
          </a>

          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <Pill icon={Clock}>{FIRM.hours}</Pill>
            <Pill icon={Scale}>Statewide CA</Pill>
          </div>

          <div className="border-border mt-5 border-t border-dashed pt-4">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
              Languages
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FIRM.languages.map((lang) => (
                <span
                  key={lang}
                  className="border-border bg-secondary/40 text-foreground rounded-md border px-2 py-0.5 text-xs font-medium"
                >
                  {lang}
                </span>
              ))}
            </div>
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
    <span className="border-border bg-secondary/40 text-foreground inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5">
      <Icon className="text-primary h-3.5 w-3.5 flex-none" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}
