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

/**
 * Client-side filter strip on top of the full case-results grid. SSR ships
 * the complete list; this component slices it client-side. Keeps the page
 * fast (no extra round trips) and the URL clean (no querystring state),
 * while giving visitors useful slicing on practice area and amount tier.
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

  const years = React.useMemo(() => {
    const set = new Set<number>();
    for (const r of results) if (typeof r.year === "number") set.add(r.year);
    return Array.from(set).sort((a, b) => b - a);
  }, [results]);

  const [area, setArea] = React.useState<string>("all");
  const [year, setYear] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    return results.filter((r) => {
      if (area !== "all" && r.practiceArea !== area) return false;
      if (year !== "all" && String(r.year ?? "") !== year) return false;
      return true;
    });
  }, [results, area, year]);

  // Only render the filter strip when there's something to filter by.
  const hasFilters = practiceAreas.length > 1 || years.length > 1;

  if (results.length === 0) {
    return (
      <div className="container-page py-12">
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center md:p-12">
          <p className="font-display text-xl font-medium tracking-tight md:text-2xl">
            Examples available on request.
          </p>
          <p className="mt-3 text-muted-foreground">
            We&apos;re updating our case-result page. For anonymized examples
            similar to your situation, call us — we&apos;ll walk through what
            we&apos;ve recovered in matters like yours.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={cn(buttonVariants({ size: "marketing" }))}
            >
              Call {FIRM.phone}
            </a>
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ variant: "outline", size: "marketing" }),
              )}
            >
              Free consultation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      {hasFilters ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Filter
          </span>
          {practiceAreas.length > 1 ? (
            <label className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Practice area
              </span>
              <select
                value={area}
                onChange={(e) => setArea(e.currentTarget.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                {practiceAreas.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {years.length > 1 ? (
            <label className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Year</span>
              <select
                value={year}
                onChange={(e) => setYear(e.currentTarget.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All</option>
                {years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {(area !== "all" || year !== "all") && (
            <button
              type="button"
              onClick={() => {
                setArea("all");
                setYear("all");
              }}
              className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              Reset
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {results.length}
          </span>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/30 p-12 text-center">
          <p className="text-muted-foreground">
            No results match this filter combination. Try widening it.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <CaseResultCard key={r.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}
