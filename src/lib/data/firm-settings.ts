/**
 * Singleton firm-settings layer. The DB row at `firm_settings.id = 1` is the
 * canonical source of truth once the migration is applied. Until then (and
 * in dev-without-Supabase), the seed below mirrors what's in `src/lib/constants.ts`
 * so behavior is identical.
 */

import { FIRM } from "@/lib/constants";
import { HOMEPAGE_FAQS, type FaqItem } from "@/lib/data/faqs";
import {
  getStaticSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type FirmSettings = {
  founded_year: number | null;
  yelp_url: string | null;
  super_lawyers_url: string | null;
  /** Homepage FAQs. Empty array means the in-code HOMEPAGE_FAQS fallback
   *  is used by callers — see `getHomepageFaqs()` below. */
  homepage_faqs: FaqItem[];
};

const SEED: FirmSettings = {
  founded_year: FIRM.founded ?? null,
  yelp_url: FIRM.socials.yelp || null,
  super_lawyers_url: FIRM.socials.superLawyers || null,
  homepage_faqs: [],
};

const SELECT_COLS = `founded_year, yelp_url, super_lawyers_url, homepage_faqs_json` as const;

export async function getFirmSettings(): Promise<FirmSettings> {
  if (!isSupabaseConfigured()) return SEED;
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("firm_settings")
    .select(SELECT_COLS)
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.warn("[firm-settings]:", error.message);
    return SEED;
  }
  if (!data) return SEED;
  return {
    founded_year: data.founded_year,
    yelp_url: data.yelp_url,
    super_lawyers_url: data.super_lawyers_url,
    homepage_faqs: Array.isArray(data.homepage_faqs_json)
      ? (data.homepage_faqs_json as FaqItem[])
      : [],
  };
}

/** Build the firm-level sameAs array used in the LegalService JSON-LD.
 *  Empty values are dropped. */
export function firmSameAs(settings: FirmSettings): string[] {
  return [settings.yelp_url, settings.super_lawyers_url].filter(
    (u): u is string => Boolean(u),
  );
}

/** Build the attorney-level sameAs array used in the Person JSON-LD.
 *  The Super Lawyers profile is attorney-specific so it belongs here too. */
export function attorneySameAs(settings: FirmSettings): string[] {
  return [settings.super_lawyers_url].filter((u): u is string => Boolean(u));
}

/** Resolved homepage FAQ list — DB content when populated, in-code
 *  HOMEPAGE_FAQS fallback otherwise. */
export async function getHomepageFaqs(): Promise<FaqItem[]> {
  const settings = await getFirmSettings();
  return settings.homepage_faqs.length > 0
    ? settings.homepage_faqs
    : HOMEPAGE_FAQS;
}

// =========================================================================
// Firm stats — optional "by the numbers" homepage band fields.
// Loaded via a SEPARATE query so this can ship before migration 0011 runs:
// if the new columns don't exist yet, the SELECT errors and we return an
// empty stats object, leaving the band hidden.
// =========================================================================

export type FirmStats = {
  years_practicing: number | null;
  settlements_total_display: string | null;
  cases_handled_display: string | null;
  consultations_display: string | null;
};

const EMPTY_STATS: FirmStats = {
  years_practicing: null,
  settlements_total_display: null,
  cases_handled_display: null,
  consultations_display: null,
};

const STATS_COLS = `years_practicing, settlements_total_display, cases_handled_display, consultations_display` as const;

export async function getFirmStats(): Promise<FirmStats> {
  if (!isSupabaseConfigured()) return EMPTY_STATS;
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("firm_settings")
    .select(STATS_COLS)
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    // Most commonly: migration 0011 hasn't been applied yet → column does
    // not exist. We swallow silently — the band stays hidden until then.
    return EMPTY_STATS;
  }
  if (!data) return EMPTY_STATS;
  return {
    years_practicing: data.years_practicing,
    settlements_total_display: data.settlements_total_display,
    cases_handled_display: data.cases_handled_display,
    consultations_display: data.consultations_display,
  };
}

/** True when any stat is populated — drives whether to render the section. */
export function hasAnyFirmStat(s: FirmStats): boolean {
  return Boolean(
    s.years_practicing ||
      s.settlements_total_display ||
      s.cases_handled_display ||
      s.consultations_display,
  );
}
