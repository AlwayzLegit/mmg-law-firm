"use client";

import * as React from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { CaseResult } from "@/components/marketing/case-result-card";
import { CaseResultCard } from "@/components/marketing/case-result-card";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  results: CaseResult[];
};

type Sort = "newest" | "highest";

function amountValue(s: string | undefined): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*(k|m|million|thousand)?/i);
  if (!m) return 0;
  const n = Number(m[1]);
  const unit = (m[2] ?? "").toLowerCase();
  if (unit === "m" || unit === "million") return n * 1_000_000;
  if (unit === "k" || unit === "thousand") return n * 1_000;
  return n;
}

/**
 * Filter pills + sort on top of the full case-results grid. SSR ships the
 * complete list; this component slices it client-side. Keeps the page fast
 * (no extra round trips) and the URL clean (no querystring state).
 *
 * Empty result set after filtering shows an explanation rather than a
 * blank — so users know the filter is the cause.
 */
export function CaseResultsFilterable({ results }: Props) {
  const practiceAreas = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of results) if (r.practiceArea) set.add(r.practiceArea);
    return Array.from(set).sort();
  }, [results]);

  const [area, setArea] = React.useState<string>("all");
  const [sort, setSort] = React.useState<Sort>("newest");

  const filtered = React.useMemo(() => {
    const list = results.filter((r) => area === "all" || r.practiceArea === area);
    if (sort === "highest") {
      return [...list].sort((a, b) => amountValue(b.amountDisplay) - amountValue(a.amountDisplay));
    }
    return [...list].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  }, [results, area, sort]);

  if (results.length === 0) {
    return (
      <div className="container-page py-12">
        <div className="border-line bg-card rounded-2xl border border-dashed p-10 text-center md:p-12">
          <p className="font-display text-xl font-semibold tracking-tight md:text-2xl">Examples available on request.</p>
          <p className="text-stone mt-3">
            We&apos;re updating our case-result page. For anonymized examples similar to your situation, call us —
            we&apos;ll walk through what we&apos;ve recovered in matters like yours.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href={`tel:${FIRM.phoneTel}`} className={buttonVariants({ variant: "gold", size: "pill" })}>
              Call {FIRM.phone}
            </a>
            <Link href="/contact" className={buttonVariants({ variant: "outline-ink", size: "pill" })}>
              Free consultation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pills = ["all", ...practiceAreas];

  return (
    <div className="container-page section-pad-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {practiceAreas.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by practice area">
            {pills.map((p) => {
              const on = area === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setArea(p)}
                  aria-pressed={on}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                    on ? "bg-ink border-ink text-cream" : "bg-card border-ink/20 text-foreground hover:border-ink",
                  )}
                >
                  {p === "all" ? `All ${results.length}` : p}
                </button>
              );
            })}
          </div>
        ) : (
          <span />
        )}
        <label className="inline-flex items-center gap-2 text-[13px] font-semibold">
          <span className="sr-only">Sort results</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.currentTarget.value as Sort)}
            className="border-line-strong bg-card focus:ring-ring h-9 rounded-full border px-3 text-[13px] font-semibold focus:ring-2 focus:outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest amount</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="border-line bg-card mt-6 rounded-2xl border border-dashed p-12 text-center">
          <p className="text-stone">No results match this filter. Try widening it.</p>
        </div>
      ) : (
        <ul className="m-0 mt-6 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3.5 p-0">
          {filtered.map((r) => (
            <li key={r.id}>
              <CaseResultCard result={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
