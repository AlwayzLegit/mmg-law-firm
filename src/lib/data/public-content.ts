/**
 * Read helpers for public-facing pages: published case_results and approved
 * testimonials. Fall back to empty arrays when Supabase isn't configured so
 * the static build stays green during dev-without-Supabase.
 */

import type { CaseResult } from "@/components/marketing/case-result-card";
import type { Testimonial } from "@/components/marketing/testimonial-card";
import { getStaticSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

type DbCaseResult = {
  id: string;
  headline: string;
  amount_display: string | null;
  year: number | null;
  anonymized_summary_md: string;
  practice_areas: { name: string } | null;
  counties: { short_name: string } | null;
};

type DbTestimonial = {
  id: string;
  quote: string;
  client_initials: string;
  city: string | null;
  rating: number | null;
  practice_areas: { name: string } | null;
};

export async function getPublishedCaseResults(
  limit = 24,
): Promise<CaseResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("case_results")
    .select(
      `id, headline, amount_display, year, anonymized_summary_md,
       practice_areas(name), counties(short_name)`,
    )
    .eq("is_published", true)
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[public-content] case-results:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as DbCaseResult[]).map((r) => ({
    id: r.id,
    headline: r.headline,
    amountDisplay: r.amount_display ?? undefined,
    practiceArea: r.practice_areas?.name,
    county: r.counties?.short_name,
    year: r.year ?? undefined,
    summary: r.anonymized_summary_md,
  }));
}

/** Case results filtered to a single practice-area slug. Used to render
 *  inline result cards on /practice-areas/[slug]. */
export async function getCaseResultsForPracticeArea(
  slug: string,
  limit = 3,
): Promise<CaseResult[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getStaticSupabase();
  // Join practice_areas, filter by slug, take recent published rows.
  const { data, error } = await supabase
    .from("case_results")
    .select(
      `id, headline, amount_display, year, anonymized_summary_md,
       practice_areas!inner(slug, name), counties(short_name)`,
    )
    .eq("is_published", true)
    .eq("practice_areas.slug", slug)
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[public-content] case-results-for-practice-area:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as DbCaseResult[]).map((r) => ({
    id: r.id,
    headline: r.headline,
    amountDisplay: r.amount_display ?? undefined,
    practiceArea: r.practice_areas?.name,
    county: r.counties?.short_name,
    year: r.year ?? undefined,
    summary: r.anonymized_summary_md,
  }));
}

export async function getApprovedTestimonials(
  limit = 24,
): Promise<Testimonial[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("testimonials")
    .select(
      `id, quote, client_initials, city, rating,
       practice_areas(name)`,
    )
    .eq("is_approved", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[public-content] testimonials:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as DbTestimonial[]).map((t) => ({
    id: t.id,
    quote: t.quote,
    initials: t.client_initials,
    city: t.city ?? undefined,
    rating: t.rating ?? undefined,
    practiceArea: t.practice_areas?.name,
  }));
}
