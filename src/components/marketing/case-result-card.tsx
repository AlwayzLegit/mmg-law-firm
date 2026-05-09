import Link from "next/link";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
        "flex h-full flex-col rounded-xl border border-border bg-card p-6",
        className,
      )}
    >
      {result.amountDisplay ? (
        <p className="font-display text-3xl font-medium tracking-tight text-primary">
          {result.amountDisplay}
        </p>
      ) : null}
      <h3 className="mt-3 font-display text-lg font-medium tracking-tight">
        {result.headline}
      </h3>
      <p className="mt-3 text-sm text-muted-foreground">{result.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {result.practiceArea ? (
          <span className="rounded-md bg-secondary px-2 py-1">
            {result.practiceArea}
          </span>
        ) : null}
        {result.county ? (
          <span className="rounded-md bg-secondary px-2 py-1">
            {result.county}
          </span>
        ) : null}
        {result.year ? (
          <span className="rounded-md bg-secondary px-2 py-1">
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
 * Selected results section. Renders a fallback empty state when no results
 * exist — Group D will replace `results` with rows from Postgres. Per spec
 * §17, we never invent case results.
 */
export function CaseResultsSection({ results, className }: SectionProps) {
  return (
    <section className={cn("container-page py-16 md:py-24", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Selected results
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Recent recoveries
          </h2>
        </div>
        <Link
          href="/case-results"
          className="text-sm font-medium text-primary hover:underline underline-offset-4"
        >
          View all results &rarr;
        </Link>
      </div>

      {results.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center">
          <p className="text-muted-foreground">
            Verified case results will appear here once attorney has reviewed
            and approved them for publication.
          </p>
          {/* TODO(human): seed `case_results` rows in Supabase, mark
                  is_published=true, and Group D will pull them in here. */}
        </div>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <CaseResultCard key={r.id} result={r} />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
        {DISCLAIMERS.results}
      </p>
    </section>
  );
}
