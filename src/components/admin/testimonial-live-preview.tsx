"use client";

import { Eye } from "lucide-react";

import {
  TestimonialCard,
  type Testimonial,
} from "@/components/marketing/testimonial-card";

type Props = {
  quote: string;
  initials: string;
  city: string;
  rating: number;
  practiceAreaId: string;
  practiceAreas: { id: string; name: string }[];
};

/**
 * Live preview of how the testimonial row renders on the public site.
 * Sticky on lg+ so it stays in view as the form scrolls.
 */
export function TestimonialLivePreview({
  quote,
  initials,
  city,
  rating,
  practiceAreaId,
  practiceAreas,
}: Props) {
  const practiceArea = practiceAreas.find(
    (p) => p.id === practiceAreaId,
  )?.name;
  const isEmpty = !quote.trim() && !initials.trim();

  const data: Testimonial = {
    id: "preview",
    quote: quote.trim() || "Client quote preview…",
    initials: initials.trim() || "—",
    city: city.trim() || undefined,
    rating: rating > 0 ? rating : undefined,
    practiceArea,
  };

  return (
    <div className="lg:sticky lg:top-4 lg:z-10">
      <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          <span>Live preview · how this renders publicly</span>
        </p>
        <div className="mt-3 pointer-events-none">
          <TestimonialCard testimonial={data} />
        </div>
        {isEmpty ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Add the client&apos;s quote + initials below to see the real preview.
          </p>
        ) : null}
      </div>
    </div>
  );
}
