/**
 * Attorney profile data layer. Mirrors the queries.ts pattern: prefers
 * Supabase when env is configured, falls back to a static seed (built from
 * `FIRM` constants) so dev-without-Supabase still renders coherently.
 *
 * The DB row at `attorney_profiles.slug = 'mihran-ghazaryan'` is the canonical
 * source of truth once the migration is applied. Until then, the seed below
 * is what the bio surfaces render.
 */

import { FIRM } from "@/lib/constants";
import {
  getStaticSupabase,
  getServerSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type AttorneyProfile = {
  id: string | null;
  slug: string;
  full_name: string;
  display_name: string | null;
  job_title: string | null;

  bar_state: string;
  bar_number: string;
  bar_admission_date: string | null;

  headshot_url: string | null;
  headshot_alt: string | null;

  short_bio: string | null;
  bio_md: string | null;

  law_school: string | null;
  law_school_year: number | null;
  undergrad_school: string | null;
  undergrad_degree: string | null;
  undergrad_year: number | null;

  federal_court_admissions: string[];
  bar_associations: string[];
  honors_md: string | null;

  languages: string[];

  avvo_url: string | null;
  justia_url: string | null;
  linkedin_url: string | null;
  super_lawyers_url: string | null;

  display_order: number;
  is_published: boolean;
};

const SELECT_COLS = `id, slug, full_name, display_name, job_title, bar_state, bar_number, bar_admission_date, headshot_url, headshot_alt, short_bio, bio_md, law_school, law_school_year, undergrad_school, undergrad_degree, undergrad_year, federal_court_admissions, bar_associations, honors_md, languages, avvo_url, justia_url, linkedin_url, super_lawyers_url, display_order, is_published` as const;

/** Seed used when Supabase isn't configured. Mirrors the migration's seed
 *  insert, plus whatever's safely known from FIRM constants. Empty fields
 *  remain empty — see hard rules #6/#7. */
const SEED_PROFILES: AttorneyProfile[] = [
  {
    id: null,
    slug: "mihran-ghazaryan",
    full_name: FIRM.attorneyName,
    display_name: FIRM.attorneyName.split(/\s+/)[0] ?? null,
    job_title: "Founder & Lead Attorney",
    bar_state: "California",
    bar_number: FIRM.barNumber,
    bar_admission_date: null,
    headshot_url: null,
    headshot_alt: null,
    short_bio: null,
    bio_md: null,
    law_school: null,
    law_school_year: null,
    undergrad_school: null,
    undergrad_degree: null,
    undergrad_year: null,
    federal_court_admissions: [],
    bar_associations: [],
    honors_md: null,
    languages: [...FIRM.languages],
    avvo_url: FIRM.socials.avvo || null,
    justia_url: FIRM.socials.justia || null,
    linkedin_url: FIRM.socials.linkedin || null,
    super_lawyers_url: FIRM.socials.superLawyers || null,
    display_order: 0,
    is_published: false,
  },
];

export async function getAttorneyProfile(
  slug: string,
): Promise<AttorneyProfile | null> {
  if (!isSupabaseConfigured()) {
    return SEED_PROFILES.find((p) => p.slug === slug) ?? null;
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("attorney_profiles")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.warn("[attorney] profile:", error.message);
    return SEED_PROFILES.find((p) => p.slug === slug) ?? null;
  }
  return (data as AttorneyProfile) ?? null;
}

/** Variant for the bio page: returns the row even when unpublished, so admins
 *  can verify how the page will look before flipping the switch. RLS still
 *  hides the row from anonymous callers; pass a server client for an admin
 *  session.
 *
 *  Falls through to the published query for non-admins. */
export async function getAttorneyProfileForPreview(
  slug: string,
): Promise<AttorneyProfile | null> {
  if (!isSupabaseConfigured()) {
    return SEED_PROFILES.find((p) => p.slug === slug) ?? null;
  }
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("attorney_profiles")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (data) return data as AttorneyProfile;
  return getAttorneyProfile(slug);
}

export async function listAttorneyProfiles(): Promise<AttorneyProfile[]> {
  if (!isSupabaseConfigured()) return SEED_PROFILES;
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("attorney_profiles")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("display_order")
    .order("full_name");
  if (error) {
    console.warn("[attorney] list:", error.message);
    return SEED_PROFILES;
  }
  return (data as AttorneyProfile[]) ?? [];
}

/** Build the `sameAs` array used in JSON-LD from whichever external URLs
 *  are populated. Empty values are dropped. */
export function attorneySameAs(profile: AttorneyProfile): string[] {
  return [
    profile.avvo_url,
    profile.justia_url,
    profile.linkedin_url,
    profile.super_lawyers_url,
  ].filter((u): u is string => Boolean(u));
}
