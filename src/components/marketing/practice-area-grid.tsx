import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PRACTICE_AREAS, type PracticeArea } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

import { PhotoOrGradient } from "./primitives/photo-or-gradient";

type Props = {
  className?: string;
  heading?: string;
  subheading?: string;
  /** Show the CSS-only category filter pills (All / Personal injury / Employment). */
  filters?: boolean;
  id?: string;
};

const ORDERED = [...PRACTICE_AREAS].sort((a, b) => a.displayOrder - b.displayOrder);

/**
 * Practice-area photo cards (practice index, county pages). All 15 cards are
 * in the HTML; the optional filter is pure CSS (radio inputs + sibling
 * selectors), so nothing is removed from the document for crawlers.
 */
export function PracticeAreaGrid({
  className,
  heading = "Practice areas",
  subheading = "Personal injury is the heart of our practice — and we also stand up for California employees in the workplace.",
  filters = false,
  id,
}: Props) {
  return (
    <section id={id} className={cn("bg-background text-foreground", className)}>
      <div className="container-page section-pad-sm pa-grid">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">{heading}</h2>
            <p className="text-stone mt-2.5 text-[15.5px]">{subheading}</p>
          </div>
          {filters ? (
            <fieldset className="m-0 flex gap-1.5 border-0 p-0">
              <legend className="sr-only">Filter practice areas</legend>
              <FilterPill value="all" label={`All ${ORDERED.length}`} defaultChecked />
              <FilterPill value="injury" label="Personal injury" />
              <FilterPill value="employment" label="Employment" />
            </fieldset>
          ) : null}
        </div>
        <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3.5 p-0">
          {ORDERED.map((area, idx) => (
            <li key={area.slug} data-category={area.category ?? "injury"}>
              <Card area={area} index={idx} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FilterPill({ value, label, defaultChecked }: { value: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="pa-filter cursor-pointer">
      <input type="radio" name="pa-filter" value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="border-ink/20 bg-card text-foreground peer-checked:bg-ink peer-checked:text-cream peer-checked:border-ink peer-focus-visible:ring-ring inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors peer-focus-visible:ring-2">
        {label}
      </span>
    </label>
  );
}

function Card({ area, index }: { area: PracticeArea; index: number }) {
  const num = String(index + 1).padStart(2, "0");
  return (
    <Link
      href={`/practice-areas/${area.slug}`}
      className="bg-card border-line text-foreground hover:shadow-hover flex h-full flex-col overflow-hidden rounded-2xl border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
    >
      <span className="bg-ink-soft relative block aspect-video overflow-hidden">
        <PhotoOrGradient
          slug={area.slug}
          icon={area.icon}
          alt=""
          sizes="(min-width: 1024px) 400px, 100vw"
          loading="lazy"
        />
        <span className="bg-ink/70 text-gold absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
          {area.category === "employment" ? "Employment law" : "Personal injury"}
        </span>
        <span aria-hidden className="font-display text-cream/35 absolute right-3.5 bottom-2.5 text-[40px] leading-none font-semibold">
          {num}
        </span>
      </span>
      <span className="flex flex-1 flex-col px-5 pt-[18px] pb-5">
        <h3 className="font-display text-[23px] leading-[1.15] font-semibold tracking-[-0.01em]">{area.name}</h3>
        <span className="text-stone mt-2 line-clamp-3 text-sm leading-[1.55]">{area.intro}</span>
        <span className="text-gold-deep mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[13px] font-semibold">
          Read more
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}
