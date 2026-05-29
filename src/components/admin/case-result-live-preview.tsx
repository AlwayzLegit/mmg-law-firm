"use client";

import { Eye } from "lucide-react";

import {
  CaseResultCard,
  type CaseResult,
} from "@/components/marketing/case-result-card";

type Props = {
  headline: string;
  amountDisplay: string;
  practiceAreaId: string;
  countyId: string;
  year: number;
  summary: string;
  practiceAreas: { id: string; name: string }[];
  counties: { id: string; name: string }[];
};

/**
 * Live preview of how the case-result row renders on the public site.
 * Wraps a real `CaseResultCard` with pointer-events disabled so the
 * attorney sees pixel-accurate output instead of an imagined version.
 * Sticky on lg+ so it stays in view as the form scrolls.
 */
export function CaseResultLivePreview({
  headline,
  amountDisplay,
  practiceAreaId,
  countyId,
  year,
  summary,
  practiceAreas,
  counties,
}: Props) {
  const practiceArea = practiceAreas.find((p) => p.id === practiceAreaId)?.name;
  const county = counties.find((c) => c.id === countyId)?.name;
  const isEmpty =
    !headline.trim() && !summary.trim() && !amountDisplay.trim();

  const data: CaseResult = {
    id: "preview",
    headline: headline.trim() || "Headline preview…",
    amountDisplay: amountDisplay.trim() || undefined,
    practiceArea,
    county,
    year: year > 0 ? year : undefined,
    summary: summary.trim() || "Summary preview…",
  };

  return (
    <div className="lg:sticky lg:top-4 lg:z-10">
      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          <span>Live preview · how this renders publicly</span>
        </p>
        <div className="mt-3 pointer-events-none">
          <CaseResultCard result={data} />
        </div>
        {isEmpty ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Fill in a headline + summary below to see the real preview.
          </p>
        ) : null}
      </div>
    </div>
  );
}
