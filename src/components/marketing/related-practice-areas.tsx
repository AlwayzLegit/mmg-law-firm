import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

type Props = {
  /** The current practice-area slug — will be excluded from the list. */
  currentSlug: string;
  /** Max number of related areas to surface. */
  max?: number;
  className?: string;
};

/**
 * Cross-link grid rendered at the bottom of each /practice-areas/[slug]
 * page. Improves internal-link graph + lateral discovery + SEO. Picks the
 * next N practice areas by `displayOrder`, wrapping around so the current
 * area is always excluded.
 */
export function RelatedPracticeAreas({
  currentSlug,
  max = 4,
  className,
}: Props) {
  const ordered = [...PRACTICE_AREAS].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
  const currentIdx = ordered.findIndex((p) => p.slug === currentSlug);
  // If the slug isn't in the list, fall back to the first N entries.
  const others =
    currentIdx === -1
      ? ordered.slice(0, max)
      : [
          ...ordered.slice(currentIdx + 1),
          ...ordered.slice(0, currentIdx),
        ].slice(0, max);

  if (others.length === 0) return null;

  return (
    <section className={cn("container-page py-16 md:py-20", className)}>
      <SectionEyebrow>Related practice areas</SectionEyebrow>
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
        We also handle
      </h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {others.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/practice-areas/${p.slug}`}
              className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <p className="font-display text-base font-medium tracking-tight">
                {p.name}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {p.intro}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-medium text-primary">
                <span className="underline-offset-4 group-hover:underline">
                  Read more
                </span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
