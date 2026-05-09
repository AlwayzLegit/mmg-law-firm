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
    <section className={cn("container-page py-16 md:py-24", className)}>
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          What we handle
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
          {heading}
        </h2>
        <p className="mt-3 text-muted-foreground">{subheading}</p>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_AREAS.sort((a, b) => a.displayOrder - b.displayOrder).map(
          (area) => (
            <li key={area.slug}>
              <PracticeAreaCard area={area} />
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function PracticeAreaCard({ area }: { area: PracticeArea }) {
  return (
    <Link
      href={`/practice-areas/${area.slug}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {createElement(resolveIcon(area.icon), {
            className: "h-5 w-5",
            "aria-hidden": true,
          })}
        </span>
        <ArrowUpRight
          className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
          aria-hidden
        />
      </div>
      <h3 className="mt-5 font-display text-lg font-medium tracking-tight">
        {area.name}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
        {area.intro}
      </p>
    </Link>
  );
}

/** Look up a Lucide icon by name, falling back to a generic shape if missing. */
function resolveIcon(name: string): Icons.LucideIcon {
  const reg = Icons as unknown as Record<string, Icons.LucideIcon | undefined>;
  return reg[name] ?? Icons.CircleDot;
}
