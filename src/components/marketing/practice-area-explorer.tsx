"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PRACTICE_AREAS, type PracticeArea } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { IconTile } from "./primitives/icon-tile";
import { PhotoOrGradient, resolveIcon } from "./primitives/photo-or-gradient";
import { Reveal } from "./primitives/reveal";

type Props = {
  className?: string;
  heading?: string;
  subheading?: string;
};

const ORDERED = [...PRACTICE_AREAS].sort((a, b) => a.displayOrder - b.displayOrder);
const INJURY = ORDERED.filter((a) => a.category !== "employment");
const EMPLOYMENT = ORDERED.filter((a) => a.category === "employment");
const NUM = new Map(ORDERED.map((a, i) => [a.slug, String(i + 1).padStart(2, "0")]));

/**
 * Practice-areas explorer (homepage): a list of all 15 areas on the left and
 * one detail panel on the right. Every panel is server-rendered (SEO parity
 * with the old card grid — same h3s, intros and hub links) and toggled with
 * `hidden`. Hovering or tapping a row previews it; tapping an already
 * previewed row follows the link to the hub page.
 */
export function PracticeAreaExplorer({
  className,
  heading = "Practice areas",
  subheading = "Personal injury is the heart of our practice — and we also stand up for California employees in the workplace.",
}: Props) {
  const [active, setActive] = React.useState(ORDERED[0]?.slug ?? "");

  return (
    <section id="practice" className={cn("surface-paper-2 bg-background text-foreground border-line border-t", className)}>
      <div className="container-page section-pad-sm">
        <Reveal className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Eyebrow>What we handle</Eyebrow>
            <h2 className="text-display mt-3.5 font-semibold">{heading}</h2>
          </div>
          <p className="text-stone max-w-[44ch] text-base">{subheading}</p>
        </Reveal>

        <Reveal
          delay={80}
          className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-7"
        >
          <div className="bg-paper border-line overflow-hidden rounded-[14px] border">
            <GroupHeading label="Personal injury" count={INJURY.length} />
            <AreaList areas={INJURY} active={active} onSelect={setActive} />
            <GroupHeading label="Employment" count={EMPLOYMENT.length} className="border-line border-t pt-3" />
            <AreaList areas={EMPLOYMENT} active={active} onSelect={setActive} />
          </div>

          <div className="relative min-h-[520px]">
            {ORDERED.map((area) => (
              <Panel key={area.slug} area={area} hidden={area.slug !== active} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function GroupHeading({ label, count, className }: { label: string; count: number; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between px-[18px] pt-4 pb-2", className)}>
      <p className="text-stone m-0 font-sans text-[15px] font-semibold tracking-[0.08em] uppercase">{label}</p>
      <span className="text-gold-deep text-xs">{count} areas</span>
    </div>
  );
}

function AreaList({
  areas,
  active,
  onSelect,
}: {
  areas: PracticeArea[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <ul className="m-0 list-none px-2 pb-2">
      {areas.map((a) => {
        const on = a.slug === active;
        return (
          <li key={a.slug}>
            <Link
              href={`/practice-areas/${a.slug}`}
              aria-current={on ? "true" : undefined}
              onMouseEnter={() => onSelect(a.slug)}
              onFocus={() => onSelect(a.slug)}
              onClick={(e) => {
                // First tap previews (touch devices have no hover); a second
                // tap on the previewed row follows the link.
                if (!on) {
                  e.preventDefault();
                  onSelect(a.slug);
                }
              }}
              className={cn(
                "grid w-full grid-cols-[32px_1fr_16px] items-center gap-2 rounded-lg px-2.5 py-2.5 text-left text-[15px] font-medium no-underline transition-colors",
                on ? "bg-ink text-cream" : "text-foreground hover:bg-ink/5",
              )}
            >
              <span className="text-gold-deep text-[11px] tracking-[0.1em] tabular-nums">{NUM.get(a.slug)}</span>
              <span>{a.name}</span>
              <ArrowRight
                className={cn("text-gold h-3.5 w-3.5 transition-opacity", on ? "opacity-100" : "opacity-0")}
                aria-hidden
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Panel({ area, hidden }: { area: PracticeArea; hidden: boolean }) {
  const num = NUM.get(area.slug);
  const employment = area.category === "employment";
  return (
    <article
      hidden={hidden}
      className="surface-ink bg-background text-foreground grid min-h-[520px] grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] overflow-hidden rounded-2xl"
    >
      <div className="bg-ink-soft relative min-h-[320px]">
        <PhotoOrGradient
          slug={area.slug}
          icon={area.icon}
          alt={`${area.name} representation in California`}
          number={num}
          sizes="(min-width: 1024px) 40vw, 100vw"
          loading="lazy"
        />
        <span className="bg-ink/70 text-gold pointer-events-none absolute top-[18px] left-[18px] inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase backdrop-blur-sm">
          {employment ? "Employment law" : "Personal injury"}
        </span>
      </div>
      <div className="flex flex-col px-9 pt-9 pb-8 max-sm:px-6 max-sm:pt-6">
        <IconTile size="xl" tone="gold">
          {React.createElement(resolveIcon(area.icon), { "aria-hidden": true })}
        </IconTile>
        <p className="text-cream/50 mt-[22px] text-xs tracking-[0.14em] uppercase">
          {num} — {area.lawyerPhrase}
        </p>
        <h3 className="text-display-sm text-cream mt-2 font-semibold">{area.name}</h3>
        <p className="text-cream/74 mt-3.5 text-[15.5px] leading-[1.65]">{area.intro}</p>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-7">
          <Link href={`/practice-areas/${area.slug}`} className={buttonVariants({ variant: "gold", size: "pill-sm" })}>
            Read more
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link href="/contact" className={buttonVariants({ variant: "outline-cream", size: "pill-sm" })}>
            Free consultation
          </Link>
        </div>
      </div>
    </article>
  );
}
