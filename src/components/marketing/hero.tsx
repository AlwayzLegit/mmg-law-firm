import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Clock,
  Globe2,
  Languages,
  Phone,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { GlassCard } from "./primitives/glass-card";
import { Seal } from "./primitives/seal";
import { Ticker } from "./primitives/ticker";

type HeroProps = {
  className?: string;
};

/** Super Lawyers Rising Stars selection years (profile verified). */
const RISING_STARS_YEARS = "2023 – 2026";

// Facts repeated from the hero/recognition copy. Decorative marquee only.
const TICKER_ITEMS = [
  "No fee unless we win",
  "Free consultation",
  `Super Lawyers Rising Stars ${RISING_STARS_YEARS.replace(" – ", "–")}`,
  `CA Bar #${FIRM.barNumber}`,
  FIRM.languages.join(" · "),
  "Statewide California",
  `Established ${FIRM.founded}`,
  "You talk to the attorney directly",
];

/**
 * Homepage hero (redesign v2): ink surface, attorney portrait on the right
 * with gradient fades, glass consultation card, rotated seal, marquee band.
 * Copy is the verbatim indexed text from the previous hero.
 */
export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn(
        "surface-ink bg-background text-foreground under-header-lg relative isolate overflow-hidden",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[62%] max-lg:w-full">
        <Image
          src="/brand/attorney-portrait.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 62vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 18%" }}
        />
        {/* One overlay layer (side fade + bottom fade). Keeping the bottom
            fade in the same top-anchored box means text reflow when the web
            font swaps in resizes it instead of moving it — no layout shift. */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,#0f1115_0%,rgba(15,17,21,0)_46%),linear-gradient(to_right,#0f1115_0%,rgba(15,17,21,.8)_24%,rgba(15,17,21,.06)_62%,rgba(15,17,21,.35)_100%)] max-lg:bg-[linear-gradient(to_top,#0f1115_0%,rgba(15,17,21,0)_46%),linear-gradient(to_bottom,rgba(15,17,21,.92)_0%,rgba(15,17,21,.7)_60%,rgba(15,17,21,.85)_100%)]" />
      </div>

      <div className="container-page relative grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-end gap-10 pt-0">
        <Seal
          years={RISING_STARS_YEARS}
          className="absolute top-[clamp(12px,2vw,24px)] right-[clamp(16px,3vw,40px)] max-md:hidden"
        />

        <div className="pb-4">
          <Eyebrow>Attorney Advertising</Eyebrow>

          <h1 className="text-display-xl text-cream mt-[18px] font-semibold">
            Focus on your recovery{" "}
            <em className="em-gold">while we fight for you.</em>
          </h1>

          <p className="text-cream/72 mt-[22px] max-w-[54ch] text-[16.5px] leading-[1.6]">
            Have you been injured in an accident because someone else was
            negligent or careless? You may be entitled to compensation.{" "}
            {FIRM.attorneyName} at {FIRM.legalName} represents personal-injury
            clients across California — and we will fight to help you get the
            money you need and deserve.
          </p>

          <div className="mt-[30px] flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}
            >
              <span>Request Free Consultation</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={buttonVariants({ variant: "outline-cream", size: "pill" })}
            >
              <Phone className="h-[15px] w-[15px]" aria-hidden />
              <span>Call {FIRM.phone}</span>
            </a>
          </div>

          <div className="text-cream/78 mt-[30px] flex flex-wrap gap-x-[22px] gap-y-2 text-[13.5px]">
            <InlineSignal icon={ShieldCheck}>No fee unless we win</InlineSignal>
            <InlineSignal icon={Globe2}>
              Counsel in {FIRM.languages.join(", ")}
            </InlineSignal>
            <InlineSignal icon={Award}>
              {FIRM.attorneyName} handles your case directly
            </InlineSignal>
          </div>
        </div>

        <ConsultationCard />
      </div>

      <div className="border-cream/10 bg-ink/60 mt-9 border-t">
        <Ticker items={TICKER_ITEMS} />
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
      <Icon className="text-gold h-[15px] w-[15px] flex-none" aria-hidden />
      <span>{children}</span>
    </span>
  );
}

/** Glass card anchoring the hero: who you'll talk to, and how to call. */
function ConsultationCard() {
  return (
    <GlassCard className="w-full max-w-[320px] px-[22px] py-5 justify-self-end max-lg:justify-self-start">
      <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.12em] uppercase">
        <span className="text-[#7ed09a]">● Free consultation</span>
        <span className="text-cream/55">CA Bar #{FIRM.barNumber}</span>
      </div>
      <p className="text-cream/50 mt-4 text-[11px] tracking-[0.14em] uppercase">Speak directly with</p>
      <p className="font-display text-cream mt-1 text-2xl leading-[1.1] font-semibold tracking-[-0.02em]">
        {FIRM.attorneyName}
      </p>
      <p className="text-cream/60 mt-1 text-[13px]">Founder · Personal-injury counsel · California</p>

      <a
        href={`tel:${FIRM.phoneTel}`}
        className="bg-gold/14 hover:bg-gold/26 text-cream mt-3.5 flex items-center gap-3 rounded-[10px] px-3 py-2.5 no-underline transition-colors"
      >
        <span className="bg-gold text-ink inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-lg">
          <Phone className="h-4 w-4" aria-hidden />
        </span>
        <span>
          <span className="text-cream/55 block text-[10px] tracking-[0.14em] uppercase">Call directly</span>
          <span className="block text-[17px] font-semibold">{FIRM.phone}</span>
        </span>
      </a>

      <div className="text-cream/70 mt-3 flex flex-wrap gap-1.5 text-xs">
        <Chip icon={Clock}>{FIRM.hours}</Chip>
        <Chip icon={Scale}>Statewide CA</Chip>
        <Chip icon={Languages}>
          <span className="sr-only">Languages: </span>
          {FIRM.languages.join(" · ")}
        </Chip>
      </div>
    </GlassCard>
  );
}

function Chip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="border-cream/14 inline-flex items-center gap-1.5 rounded-full border px-[9px] py-1">
      <Icon className="text-gold h-3 w-3" aria-hidden />
      {children}
    </span>
  );
}
