import Link from "next/link";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

export type CaseResult = {
  id: string;
  headline: string;
  amountDisplay?: string;
  practiceArea?: string;
  county?: string;
  year?: number;
  summary: string;
};

type Props = { result: CaseResult; className?: string };

export function CaseResultCard({ result, className }: Props) {
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-24px_rgba(20,30,80,0.2)]",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent opacity-60"
      />
      {result.amountDisplay ? (
        <p className="font-display text-[2.75rem] font-medium leading-[1] tracking-tight text-primary">
          {result.amountDisplay}
        </p>
      ) : null}
      <h3 className="mt-4 font-display text-lg font-medium tracking-tight">
        {result.headline}
      </h3>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
        {result.summary}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-5 text-xs">
        {result.practiceArea ? (
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1 font-medium text-foreground">
            {result.practiceArea}
          </span>
        ) : null}
        {result.county ? (
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-muted-foreground">
            {result.county}
          </span>
        ) : null}
        {result.year ? (
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-muted-foreground">
            {result.year}
          </span>
        ) : null}
      </div>
    </article>
  );
}

type SectionProps = {
  results: CaseResult[];
  className?: string;
};

/**
 * Selected results section. Hidden entirely when there are no published
 * results — we never show an empty placeholder on the public site. Per
 * spec §17, we never invent case results.
 */
export function CaseResultsSection({ results, className }: SectionProps) {
  if (results.length === 0) return null;
  return (
    <section className={cn("container-page py-20 md:py-28", className)}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <SectionEyebrow>Selected results</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Recent recoveries
          </h2>
        </div>
        <Link
          href="/case-results"
          className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <span className="underline-offset-4 group-hover/link:underline">
            View all results
          </span>
          <span className="transition-transform group-hover/link:translate-x-0.5">
            &rarr;
          </span>
        </Link>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <CaseResultCard key={r.id} result={r} />
        ))}
      </div>

      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        {DISCLAIMERS.results}
      </p>
    </section>
  );
}
