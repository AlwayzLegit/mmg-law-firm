/**
 * Tier 1 California cities the firm prioritizes for content. Mirrors the
 * Supabase `cities` table shape; populated via 0003_seed_geo.sql when DB lands.
 *
 * Group D builds out per-city pages backed by Postgres. Until then, the home
 * page reads this static list to render the "Locations served" block.
 */

export type LocationSeed = {
  citySlug: string;
  cityName: string;
  countySlug: string;
  countyName: string;
};

export const TIER_1_LOCATIONS: LocationSeed[] = [
  { citySlug: "glendale", cityName: "Glendale", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "los-angeles", cityName: "Los Angeles", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "burbank", cityName: "Burbank", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "pasadena", cityName: "Pasadena", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "long-beach", cityName: "Long Beach", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "santa-monica", cityName: "Santa Monica", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "beverly-hills", cityName: "Beverly Hills", countySlug: "los-angeles-county", countyName: "Los Angeles County" },
  { citySlug: "anaheim", cityName: "Anaheim", countySlug: "orange-county", countyName: "Orange County" },
  { citySlug: "santa-ana", cityName: "Santa Ana", countySlug: "orange-county", countyName: "Orange County" },
  { citySlug: "irvine", cityName: "Irvine", countySlug: "orange-county", countyName: "Orange County" },
  { citySlug: "riverside", cityName: "Riverside", countySlug: "riverside-county", countyName: "Riverside County" },
  { citySlug: "san-bernardino", cityName: "San Bernardino", countySlug: "san-bernardino-county", countyName: "San Bernardino County" },
  { citySlug: "san-diego", cityName: "San Diego", countySlug: "san-diego-county", countyName: "San Diego County" },
  { citySlug: "bakersfield", cityName: "Bakersfield", countySlug: "kern-county", countyName: "Kern County" },
  { citySlug: "fresno", cityName: "Fresno", countySlug: "fresno-county", countyName: "Fresno County" },
  { citySlug: "sacramento", cityName: "Sacramento", countySlug: "sacramento-county", countyName: "Sacramento County" },
  { citySlug: "san-francisco", cityName: "San Francisco", countySlug: "san-francisco-county", countyName: "San Francisco County" },
  { citySlug: "san-jose", cityName: "San Jose", countySlug: "santa-clara-county", countyName: "Santa Clara County" },
  { citySlug: "oakland", cityName: "Oakland", countySlug: "alameda-county", countyName: "Alameda County" },
];

/** Group major cities by region for the homepage block. */
export const REGIONS: { region: string; cities: LocationSeed[] }[] = [
  {
    region: "Los Angeles & San Fernando Valley",
    cities: TIER_1_LOCATIONS.filter((l) => l.countySlug === "los-angeles-county"),
  },
  {
    region: "Orange County",
    cities: TIER_1_LOCATIONS.filter((l) => l.countySlug === "orange-county"),
  },
  {
    region: "Inland Empire",
    cities: TIER_1_LOCATIONS.filter((l) =>
      ["riverside-county", "san-bernardino-county"].includes(l.countySlug),
    ),
  },
  {
    region: "San Diego",
    cities: TIER_1_LOCATIONS.filter((l) => l.countySlug === "san-diego-county"),
  },
  {
    region: "Central Valley",
    cities: TIER_1_LOCATIONS.filter((l) =>
      ["kern-county", "fresno-county", "sacramento-county"].includes(
        l.countySlug,
      ),
    ),
  },
  {
    region: "Bay Area",
    cities: TIER_1_LOCATIONS.filter((l) =>
      [
        "san-francisco-county",
        "santa-clara-county",
        "alameda-county",
      ].includes(l.countySlug),
    ),
  },
];
