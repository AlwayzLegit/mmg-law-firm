import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { PhotoOrGradient } from "./primitives/photo-or-gradient";

type Props = {
  /** The current practice-area slug — will be excluded from the list. */
  currentSlug: string;
  /** Max number of related areas to surface. */
  max?: number;
  className?: string;
  id?: string;
};

/**
 * Cross-link photo cards at the bottom of each /practice-areas/[slug] page.
 * Improves internal-link graph + lateral discovery + SEO. Picks the next N
 * practice areas by `displayOrder`, wrapping around so the current area is
 * always excluded.
 */
export function RelatedPracticeAreas({ currentSlug, max = 4, className, id }: Props) {
  const ordered = [...PRACTICE_AREAS].sort((a, b) => a.displayOrder - b.displayOrder);
  const currentIdx = ordered.findIndex((p) => p.slug === currentSlug);
  // If the slug isn't in the list, fall back to the first N entries.
  const others =
    currentIdx === -1
      ? ordered.slice(0, max)
      : [...ordered.slice(currentIdx + 1), ...ordered.slice(0, currentIdx)].slice(0, max);

  if (others.length === 0) return null;

  return (
    <section
      id={id}
      className={cn("surface-paper-2 bg-background text-foreground border-line scroll-mt-[130px] border-t", className)}
    >
      <div className="container-page py-[clamp(48px,7vw,72px)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>Related practice areas</Eyebrow>
            <h2 className="mt-3 text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">
              We also handle
            </h2>
          </div>
          <Link
            href="/practice-areas"
            className="text-foreground inline-flex items-center gap-2 text-[13px] font-semibold no-underline"
          >
            All practice areas
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5 p-0">
          {others.map((p) => {
            const num = String(ordered.indexOf(p) + 1).padStart(2, "0");
            return (
              <li key={p.slug}>
                <Link
                  href={`/practice-areas/${p.slug}`}
                  className="bg-card border-line text-foreground hover:shadow-hover flex h-full flex-col overflow-hidden rounded-2xl border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
                >
                  <span className="bg-ink-soft relative block aspect-[16/10]">
                    <PhotoOrGradient slug={p.slug} icon={p.icon} alt="" number={num} sizes="(min-width: 1024px) 300px, 100vw" />
                  </span>
                  <span className="flex flex-col gap-1.5 px-[18px] pt-4 pb-[18px]">
                    <span className="text-gold-deep text-[11px] tracking-[0.14em]">{num}</span>
                    <span className="font-display text-[21px] leading-[1.15] font-semibold tracking-[-0.01em]">{p.name}</span>
                    <span className="text-stone line-clamp-2 text-[13.5px] leading-[1.5]">{p.intro}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
