import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { LEGAL_PAGE_SLUGS, LEGAL_PAGE_FALLBACKS } from "@/lib/data/legal-pages";

/**
 * Public URL inventory the agent uses for internal linking. Published rows
 * only. Bounded by `limit` on the (potentially large) location list.
 */
export type SiteUrls = {
  practice_areas: Array<{ slug: string; name: string; url: string; category: string }>;
  counties: Array<{ slug: string; name: string; url: string }>;
  locations: Array<{
    url: string;
    city: string;
    county: string;
    practice_area: string;
    practice_area_slug: string;
  }>;
  legal: Array<{ slug: string; title: string; url: string }>;
  static: string[];
  truncated: boolean;
  total_locations: number;
};

export const STATIC_URLS = [
  "/",
  "/attorneys/mihran-ghazaryan",
  "/contact",
  "/practice-areas",
  "/locations",
  "/blog",
];

export async function buildSiteUrls(
  supabase: SupabaseClient,
  opts: { limit?: number; offset?: number } = {},
): Promise<SiteUrls> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);

  const [pa, co, lp, legal] = await Promise.all([
    supabase
      .from("practice_areas")
      .select("slug, name, is_published")
      .eq("is_published", true)
      .order("display_order"),
    supabase.from("counties").select("slug, name").eq("is_published", true).order("name"),
    supabase
      .from("location_pages")
      .select(
        "cities!inner(slug, name, counties!inner(slug, name)), practice_areas!inner(slug, name)",
        { count: "exact" },
      )
      .eq("is_published", true)
      .not("local_angle_md", "is", null)
      .range(offset, offset + limit - 1),
    supabase.from("legal_pages").select("slug, title").eq("is_published", true),
  ]);

  // Practice areas: prefer DB rows, fall back to the static list (which is the
  // routing source of truth anyway — all 15 render regardless of the flag).
  const staticPa = PRACTICE_AREAS.map((p) => ({
    slug: p.slug,
    name: p.name,
    url: `/practice-areas/${p.slug}`,
    category: p.category ?? "injury",
  }));
  const dbSlugs = new Set(((pa.data ?? []) as Array<{ slug: string }>).map((r) => r.slug));
  const practice_areas = dbSlugs.size > 0 ? staticPa.filter((p) => dbSlugs.has(p.slug)) : staticPa;

  type LpRow = {
    cities: { slug: string; name: string; counties: { slug: string; name: string } };
    practice_areas: { slug: string; name: string };
  };
  const locations = ((lp.data ?? []) as unknown as LpRow[]).map((r) => ({
    url: `/locations/${r.cities.counties.slug}/${r.cities.slug}/${r.practice_areas.slug}`,
    city: r.cities.name,
    county: r.cities.counties.name,
    practice_area: r.practice_areas.name,
    practice_area_slug: r.practice_areas.slug,
  }));
  locations.sort((a, b) => a.city.localeCompare(b.city) || a.practice_area.localeCompare(b.practice_area));

  const legalRows = (legal.data ?? []) as Array<{ slug: string; title: string }>;
  const legalOut = (legalRows.length > 0
    ? legalRows
    : LEGAL_PAGE_SLUGS.map((s) => ({ slug: s, title: LEGAL_PAGE_FALLBACKS[s].title }))
  ).map((l) => ({ slug: l.slug, title: l.title, url: `/legal/${l.slug}` }));

  const total = lp.count ?? locations.length;
  return {
    practice_areas,
    counties: ((co.data ?? []) as Array<{ slug: string; name: string }>).map((c) => ({
      ...c,
      url: `/locations/${c.slug}`,
    })),
    locations,
    legal: legalOut,
    static: STATIC_URLS,
    truncated: offset + locations.length < total,
    total_locations: total,
  };
}
