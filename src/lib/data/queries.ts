/**
 * Typed query helpers for the public site. Each helper prefers Supabase
 * when env is configured and falls back to the static seed otherwise so
 * the build stays green during dev-without-Supabase.
 *
 * RLS at the DB layer ensures only published rows are returned; we still
 * filter in code defensively when reading from the static seed.
 */

import { ALL_COUNTIES, type CountySeed } from "@/lib/data/counties-seed";
import { TIER_1_LOCATIONS, type LocationSeed } from "@/lib/data/locations";
import {
  PRACTICE_AREAS,
  findPracticeArea,
  type PracticeArea,
} from "@/lib/data/practice-areas";
import { getStaticSupabase, isSupabaseConfigured } from "@/lib/supabase/server";

export type CountyRow = {
  slug: string;
  name: string;
  short_name: string;
  fips: string | null;
  seat: string | null;
  region: string | null;
  superior_court_address: string | null;
  intro_md?: string | null;
  local_stats_md?: string | null;
  meta_description?: string | null;
  updated_at?: string | null;
};

export type CityRow = {
  slug: string;
  name: string;
  county_slug: string;
  county_name: string;
  intro_md?: string | null;
  local_stats_md?: string | null;
  meta_description?: string | null;
  updated_at?: string | null;
};

export type LocationPageRow = {
  city_slug: string;
  city_name: string;
  county_slug: string;
  county_name: string;
  practice_area_slug: string;
  practice_area_name: string;
  intro_md: string | null;
  local_angle_md: string | null;
  meta_description: string | null;
  faq_json: Array<{ question: string; answer: string }>;
  updated_at?: string | null;
};

// ---------------------------------------------------------------------------
// Counties
// ---------------------------------------------------------------------------

export async function getPublishedCounties(): Promise<CountyRow[]> {
  if (!isSupabaseConfigured()) {
    return ALL_COUNTIES.filter((c) => c.isPublished).map(toCountyRow);
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("counties")
    .select(
      "slug, name, short_name, fips, seat, region, superior_court_address, intro_md, local_stats_md, meta_description, is_published, updated_at",
    )
    .eq("is_published", true);
  if (error) {
    console.warn("[queries] counties:", error.message);
    return ALL_COUNTIES.filter((c) => c.isPublished).map(toCountyRow);
  }
  return (data ?? []) as CountyRow[];
}

export async function getCountyBySlug(slug: string): Promise<CountyRow | null> {
  if (!isSupabaseConfigured()) {
    const c = ALL_COUNTIES.find((x) => x.slug === slug && x.isPublished);
    return c ? toCountyRow(c) : null;
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("counties")
    .select(
      "slug, name, short_name, fips, seat, region, superior_court_address, intro_md, local_stats_md, meta_description, is_published",
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.warn("[queries] county:", error.message);
    const c = ALL_COUNTIES.find((x) => x.slug === slug && x.isPublished);
    return c ? toCountyRow(c) : null;
  }
  return (data as CountyRow) ?? null;
}

function toCountyRow(c: CountySeed): CountyRow {
  return {
    slug: c.slug,
    name: c.name,
    short_name: c.shortName,
    fips: c.fips,
    seat: c.seat,
    region: c.region,
    superior_court_address: null,
    intro_md: null,
    local_stats_md: null,
    meta_description: null,
  };
}

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

export async function getCitiesInCounty(countySlug: string): Promise<CityRow[]> {
  if (!isSupabaseConfigured()) {
    return TIER_1_LOCATIONS.filter((l) => l.countySlug === countySlug).map(
      toCityRow,
    );
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      "slug, name, intro_md, local_stats_md, meta_description, counties!inner(slug, name)",
    )
    .eq("is_published", true)
    .eq("counties.slug", countySlug);
  if (error) {
    console.warn("[queries] cities-in-county:", error.message);
    return TIER_1_LOCATIONS.filter((l) => l.countySlug === countySlug).map(
      toCityRow,
    );
  }
  return ((data ?? []) as unknown as DbCityWithCounty[]).map(flattenCity);
}

export async function getCityBySlug(
  countySlug: string,
  citySlug: string,
): Promise<CityRow | null> {
  if (!isSupabaseConfigured()) {
    const found = TIER_1_LOCATIONS.find(
      (l) => l.countySlug === countySlug && l.citySlug === citySlug,
    );
    return found ? toCityRow(found) : null;
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      "slug, name, intro_md, local_stats_md, meta_description, counties!inner(slug, name)",
    )
    .eq("is_published", true)
    .eq("slug", citySlug)
    .eq("counties.slug", countySlug)
    .maybeSingle();
  if (error) {
    console.warn("[queries] city:", error.message);
    const found = TIER_1_LOCATIONS.find(
      (l) => l.countySlug === countySlug && l.citySlug === citySlug,
    );
    return found ? toCityRow(found) : null;
  }
  return data ? flattenCity(data as unknown as DbCityWithCounty) : null;
}

export async function getAllPublishedCities(): Promise<CityRow[]> {
  if (!isSupabaseConfigured()) {
    return TIER_1_LOCATIONS.map(toCityRow);
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      "slug, name, intro_md, local_stats_md, meta_description, updated_at, counties!inner(slug, name)",
    )
    .eq("is_published", true);
  if (error) {
    console.warn("[queries] all-cities:", error.message);
    return TIER_1_LOCATIONS.map(toCityRow);
  }
  return ((data ?? []) as unknown as DbCityWithCounty[]).map(flattenCity);
}

type DbCityWithCounty = {
  slug: string;
  name: string;
  intro_md?: string | null;
  local_stats_md?: string | null;
  meta_description?: string | null;
  updated_at?: string | null;
  counties: { slug: string; name: string };
};

function flattenCity(row: DbCityWithCounty): CityRow {
  return {
    slug: row.slug,
    name: row.name,
    county_slug: row.counties.slug,
    county_name: row.counties.name,
    intro_md: row.intro_md ?? null,
    local_stats_md: row.local_stats_md ?? null,
    meta_description: row.meta_description ?? null,
    updated_at: row.updated_at ?? null,
  };
}

function toCityRow(l: LocationSeed): CityRow {
  return {
    slug: l.citySlug,
    name: l.cityName,
    county_slug: l.countySlug,
    county_name: l.countyName,
    intro_md: null,
    local_stats_md: null,
    meta_description: null,
  };
}

// ---------------------------------------------------------------------------
// Practice areas
// ---------------------------------------------------------------------------

export async function getPracticeAreas(): Promise<PracticeArea[]> {
  // Static seed is canonical for practice areas — Group C uses the
  // editorial content keyed by slug. Once attorney-reviewed body_md is
  // stored in DB and is_published=true, this will pull from Postgres.
  return PRACTICE_AREAS;
}

export async function getPracticeAreaBySlug(
  slug: string,
): Promise<PracticeArea | undefined> {
  return findPracticeArea(slug);
}

// ---------------------------------------------------------------------------
// Location pages (city × practice). Per spec §17, requires non-empty
// local_angle_md to publish. RLS enforces this at the DB layer too.
// ---------------------------------------------------------------------------

export async function getPublishedLocationPages(): Promise<LocationPageRow[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("location_pages")
    .select(
      `
        intro_md,
        local_angle_md,
        meta_description,
        faq_json,
        updated_at,
        cities!inner(slug, name, counties!inner(slug, name)),
        practice_areas!inner(slug, name)
      `,
    )
    .eq("is_published", true)
    .not("local_angle_md", "is", null);
  if (error) {
    console.warn("[queries] location-pages:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as DbLocationPage[]).map(flattenLocationPage);
}

/**
 * Returns the practice-area slugs that have a published location_pages row
 * for the given (countySlug, citySlug). Used by the city page to decide
 * whether to link to `/locations/{county}/{city}/{practice}` or fall back
 * to the always-available `/practice-areas/{practice}` hub.
 */
export async function getPublishedPracticeSlugsForCity(
  countySlug: string,
  citySlug: string,
): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("location_pages")
    .select(
      `
        cities!inner(slug, counties!inner(slug)),
        practice_areas!inner(slug)
      `,
    )
    .eq("is_published", true)
    .eq("cities.slug", citySlug)
    .eq("cities.counties.slug", countySlug)
    .not("local_angle_md", "is", null);
  if (error) {
    console.warn("[queries] practice-slugs-for-city:", error.message);
    return new Set();
  }
  type Row = { practice_areas: { slug: string } };
  return new Set(
    ((data ?? []) as unknown as Row[]).map((r) => r.practice_areas.slug),
  );
}

export async function getLocationPage(
  countySlug: string,
  citySlug: string,
  practiceSlug: string,
): Promise<LocationPageRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("location_pages")
    .select(
      `
        intro_md,
        local_angle_md,
        meta_description,
        faq_json,
        cities!inner(slug, name, counties!inner(slug, name)),
        practice_areas!inner(slug, name)
      `,
    )
    .eq("is_published", true)
    .eq("cities.slug", citySlug)
    .eq("cities.counties.slug", countySlug)
    .eq("practice_areas.slug", practiceSlug)
    .not("local_angle_md", "is", null)
    .maybeSingle();
  if (error) {
    console.warn("[queries] location-page:", error.message);
    return null;
  }
  return data ? flattenLocationPage(data as unknown as DbLocationPage) : null;
}

type DbLocationPage = {
  intro_md: string | null;
  local_angle_md: string | null;
  meta_description: string | null;
  faq_json: Array<{ question: string; answer: string }> | null;
  updated_at?: string | null;
  cities: {
    slug: string;
    name: string;
    counties: { slug: string; name: string };
  };
  practice_areas: { slug: string; name: string };
};

function flattenLocationPage(row: DbLocationPage): LocationPageRow {
  return {
    city_slug: row.cities.slug,
    city_name: row.cities.name,
    county_slug: row.cities.counties.slug,
    county_name: row.cities.counties.name,
    practice_area_slug: row.practice_areas.slug,
    practice_area_name: row.practice_areas.name,
    intro_md: row.intro_md,
    local_angle_md: row.local_angle_md,
    meta_description: row.meta_description,
    faq_json: row.faq_json ?? [],
    updated_at: row.updated_at ?? null,
  };
}
