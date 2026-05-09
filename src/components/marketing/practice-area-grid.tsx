import { createElement } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { ArrowUpRight } from "lucide-react";

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
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="block h-px w-8 bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-[var(--color-gold-500)]" />
            What we handle
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {heading}
          </h2>
          <p className="mt-4 text-muted-foreground">{subheading}</p>
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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_48px_-24px_rgba(20,30,80,0.25)]"
    >
      {/* hover-only gold accent strip */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-gold-500)] via-primary to-[var(--color-gold-500)] transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="flex items-start justify-between gap-4">
        <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/[0.08] text-primary ring-1 ring-inset ring-primary/[0.12] transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
          {createElement(resolveIcon(area.icon), {
            className: "h-6 w-6",
            "aria-hidden": true,
          })}
        </span>
        <span
          className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="mt-7 font-display text-xl font-medium tracking-tight">
        {area.name}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {area.intro}
      </p>

      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        <span>Read more</span>
        <ArrowUpRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
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
