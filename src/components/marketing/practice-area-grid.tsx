import { createElement } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowUpRight } from "lucide-react";

import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { PRACTICE_AREAS, type PracticeArea } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  heading?: string;
  subheading?: string;
};

export function PracticeAreaGrid({
  className,
  heading = "Practice areas",
  subheading = "Personal injury is what we do — across every common cause of injury in California.",
}: Props) {
  return (
    <section className={cn("container-page py-20 md:py-28", className)}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <SectionEyebrow>What we handle</SectionEyebrow>
          <h2 className="font-display mt-4 text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {heading}
          </h2>
          <p className="text-muted-foreground mt-4">{subheading}</p>
        </div>
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_AREAS.sort((a, b) => a.displayOrder - b.displayOrder).map(
          (area, idx) => (
            <li key={area.slug}>
              <PracticeAreaCard area={area} index={idx} />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function PracticeAreaCard({
  area,
  index,
}: {
  area: PracticeArea;
  index: number;
}) {
  return (
    <Link
      href={`/practice-areas/${area.slug}`}
      className="group border-border bg-card ring-border/40 hover:border-primary/40 focus-visible:ring-ring relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 ring-1 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-25px_rgba(20,30,80,0.3)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:p-8"
    >
      {/* Top rule — appears only on hover, so gold stays signature-rare. */}
      <span
        aria-hidden
        className="via-primary absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-500)] transition-transform duration-300 group-hover:scale-x-100"
      />
      {/* Ambient gradient blob on hover — top right */}
      <span
        aria-hidden
        className="from-primary/15 via-primary/5 pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-gradient-to-br to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between gap-4">
        <span className="from-primary/15 to-primary/5 text-primary ring-primary/15 group-hover:from-primary group-hover:text-primary-foreground group-hover:ring-primary relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ring-1 transition-all duration-300 ring-inset group-hover:scale-110 group-hover:to-[var(--color-brand-700,#18298c)] group-hover:shadow-[0_12px_30px_-12px_rgba(43,70,216,0.6)]">
          {createElement(resolveIcon(area.icon), {
            className: "h-7 w-7",
            "aria-hidden": true,
          })}
        </span>
        <span
          className="font-display text-muted-foreground/30 group-hover:text-primary/40 text-3xl font-medium tracking-tight transition-colors"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="font-display group-hover:text-primary relative mt-8 text-xl font-medium tracking-tight transition-colors md:text-[1.35rem]">
        {area.name}
      </h3>
      <p className="text-muted-foreground relative mt-3 line-clamp-3 text-sm leading-relaxed">
        {area.intro}
      </p>

      <span className="text-primary relative mt-7 inline-flex items-center gap-1.5 text-sm font-semibold">
        <span className="group-hover:border-primary/60 border-b border-transparent transition-colors">
          Read more
        </span>
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
          aria-hidden
        />
      </span>
    </Link>
  );
}

/** Look up a Lucide icon by name, falling back to a generic shape if missing. */
function resolveIcon(name: string): Icons.LucideIcon {
  const reg = Icons as unknown as Record<string, Icons.LucideIcon | undefined>;
  return reg[name] ?? Icons.CircleDot;
}
