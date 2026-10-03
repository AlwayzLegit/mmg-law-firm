import Link from "next/link";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";

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

/** White result card: micro-label, Newsreader amount, summary, footer meta. */
export function CaseResultCard({ result, className }: Props) {
  return (
    <article
      className={cn(
        "bg-card border-line relative flex h-full flex-col rounded-2xl border p-[22px] transition-shadow hover:shadow-hover",
        className,
      )}
    >
      <p className="micro-label text-stone m-0">Settlement / verdict</p>
      {result.amountDisplay ? (
        <p className="font-display text-foreground mt-1.5 text-[44px] leading-none font-semibold tracking-[-0.03em]">
          {result.amountDisplay}
        </p>
      ) : null}
      <h3 className="font-display mt-4 text-lg leading-[1.25] font-semibold tracking-[-0.01em]">
        {result.headline}
      </h3>
      <p className="text-stone mt-3 line-clamp-4 text-sm leading-relaxed">{result.summary}</p>
      <p className="text-stone mt-auto flex flex-wrap justify-between gap-2 pt-4 text-xs">
        <span>
          {[result.practiceArea, result.county].filter(Boolean).join(" · ") || "Case type"}
        </span>
        {result.year ? <span>{result.year}</span> : null}
      </p>
    </article>
  );
}

type SectionProps = {
  results: CaseResult[];
  className?: string;
  /** Rendered without its own section wrapper (inside the trust block). */
  embedded?: boolean;
};

/**
 * Selected results. Hidden entirely when there are no published results — we
 * never show an empty placeholder on the public site. Per spec §17, we never
 * invent case results.
 */
export function CaseResultsSection({ results, className, embedded = false }: SectionProps) {
  if (results.length === 0) return null;
  const body = (
    <>
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Results &amp; reviews</Eyebrow>
          <h2 className="text-display mt-3.5 font-semibold">Recent results</h2>
        </div>
        <Link
          href="/case-results"
          className="text-foreground group/link inline-flex items-center gap-1.5 text-sm font-semibold no-underline"
        >
          <span className="underline-offset-4 group-hover/link:underline">View all results</span>
          <span className="transition-transform group-hover/link:translate-x-0.5">&rarr;</span>
        </Link>
      </Reveal>
      <Reveal delay={60}>
        <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5 p-0">
          {results.map((r) => (
            <li key={r.id}>
              <CaseResultCard result={r} />
            </li>
          ))}
        </ul>
      </Reveal>
      <p className="text-stone mt-3 max-w-3xl text-xs leading-relaxed">{DISCLAIMERS.results}</p>
    </>
  );
  if (embedded) return <div className={className}>{body}</div>;
  return (
    <section className={cn("bg-background text-foreground border-line border-t", className)}>
      <div className="container-page section-pad-sm">{body}</div>
    </section>
  );
}
