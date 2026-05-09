/**
 * Static counties seed used as a build-time fallback when the Supabase
 * connection isn't available. Mirrors the rows inserted by
 * supabase/migrations/0003_seed_geo.sql, in matching order.
 *
 * `is_published` is true only for the counties Tier-1 cities live in;
 * the rest match the SQL seed (false). Group D's queries prefer the DB
 * when env is set; this list is for the dev-without-Supabase case so the
 * `/locations/...` routes still build and render.
 */

export type CountySeed = {
  slug: string;
  name: string;
  shortName: string;
  fips: string;
  seat: string;
  region: string;
  isPublished: boolean;
};

const PUBLISHED = new Set([
  "los-angeles-county",
  "orange-county",
  "riverside-county",
  "san-bernardino-county",
  "san-diego-county",
  "kern-county",
  "fresno-county",
  "sacramento-county",
  "san-francisco-county",
  "santa-clara-county",
  "alameda-county",
]);

const COUNTY_BASE: Omit<CountySeed, "isPublished">[] = [
  { slug: "alameda-county", name: "Alameda County", shortName: "Alameda", fips: "06001", seat: "Oakland", region: "Bay Area" },
  { slug: "alpine-county", name: "Alpine County", shortName: "Alpine", fips: "06003", seat: "Markleeville", region: "Sierra Nevada" },
  { slug: "amador-county", name: "Amador County", shortName: "Amador", fips: "06005", seat: "Jackson", region: "Sierra Nevada" },
  { slug: "butte-county", name: "Butte County", shortName: "Butte", fips: "06007", seat: "Oroville", region: "Northern California" },
  { slug: "calaveras-county", name: "Calaveras County", shortName: "Calaveras", fips: "06009", seat: "San Andreas", region: "Sierra Nevada" },
  { slug: "colusa-county", name: "Colusa County", shortName: "Colusa", fips: "06011", seat: "Colusa", region: "Northern California" },
  { slug: "contra-costa-county", name: "Contra Costa County", shortName: "Contra Costa", fips: "06013", seat: "Martinez", region: "Bay Area" },
  { slug: "del-norte-county", name: "Del Norte County", shortName: "Del Norte", fips: "06015", seat: "Crescent City", region: "Northern California" },
  { slug: "el-dorado-county", name: "El Dorado County", shortName: "El Dorado", fips: "06017", seat: "Placerville", region: "Sierra Nevada" },
  { slug: "fresno-county", name: "Fresno County", shortName: "Fresno", fips: "06019", seat: "Fresno", region: "Central Valley" },
  { slug: "glenn-county", name: "Glenn County", shortName: "Glenn", fips: "06021", seat: "Willows", region: "Northern California" },
  { slug: "humboldt-county", name: "Humboldt County", shortName: "Humboldt", fips: "06023", seat: "Eureka", region: "Northern California" },
  { slug: "imperial-county", name: "Imperial County", shortName: "Imperial", fips: "06025", seat: "El Centro", region: "Southern California" },
  { slug: "inyo-county", name: "Inyo County", shortName: "Inyo", fips: "06027", seat: "Independence", region: "Eastern California" },
  { slug: "kern-county", name: "Kern County", shortName: "Kern", fips: "06029", seat: "Bakersfield", region: "Central Valley" },
  { slug: "kings-county", name: "Kings County", shortName: "Kings", fips: "06031", seat: "Hanford", region: "Central Valley" },
  { slug: "lake-county", name: "Lake County", shortName: "Lake", fips: "06033", seat: "Lakeport", region: "Northern California" },
  { slug: "lassen-county", name: "Lassen County", shortName: "Lassen", fips: "06035", seat: "Susanville", region: "Northern California" },
  { slug: "los-angeles-county", name: "Los Angeles County", shortName: "Los Angeles", fips: "06037", seat: "Los Angeles", region: "Southern California" },
  { slug: "madera-county", name: "Madera County", shortName: "Madera", fips: "06039", seat: "Madera", region: "Central Valley" },
  { slug: "marin-county", name: "Marin County", shortName: "Marin", fips: "06041", seat: "San Rafael", region: "Bay Area" },
  { slug: "mariposa-county", name: "Mariposa County", shortName: "Mariposa", fips: "06043", seat: "Mariposa", region: "Sierra Nevada" },
  { slug: "mendocino-county", name: "Mendocino County", shortName: "Mendocino", fips: "06045", seat: "Ukiah", region: "Northern California" },
  { slug: "merced-county", name: "Merced County", shortName: "Merced", fips: "06047", seat: "Merced", region: "Central Valley" },
  { slug: "modoc-county", name: "Modoc County", shortName: "Modoc", fips: "06049", seat: "Alturas", region: "Northern California" },
  { slug: "mono-county", name: "Mono County", shortName: "Mono", fips: "06051", seat: "Bridgeport", region: "Eastern California" },
  { slug: "monterey-county", name: "Monterey County", shortName: "Monterey", fips: "06053", seat: "Salinas", region: "Central Coast" },
  { slug: "napa-county", name: "Napa County", shortName: "Napa", fips: "06055", seat: "Napa", region: "Bay Area" },
  { slug: "nevada-county", name: "Nevada County", shortName: "Nevada", fips: "06057", seat: "Nevada City", region: "Sierra Nevada" },
  { slug: "orange-county", name: "Orange County", shortName: "Orange", fips: "06059", seat: "Santa Ana", region: "Southern California" },
  { slug: "placer-county", name: "Placer County", shortName: "Placer", fips: "06061", seat: "Auburn", region: "Sierra Nevada" },
  { slug: "plumas-county", name: "Plumas County", shortName: "Plumas", fips: "06063", seat: "Quincy", region: "Sierra Nevada" },
  { slug: "riverside-county", name: "Riverside County", shortName: "Riverside", fips: "06065", seat: "Riverside", region: "Southern California" },
  { slug: "sacramento-county", name: "Sacramento County", shortName: "Sacramento", fips: "06067", seat: "Sacramento", region: "Sacramento Valley" },
  { slug: "san-benito-county", name: "San Benito County", shortName: "San Benito", fips: "06069", seat: "Hollister", region: "Central Coast" },
  { slug: "san-bernardino-county", name: "San Bernardino County", shortName: "San Bernardino", fips: "06071", seat: "San Bernardino", region: "Southern California" },
  { slug: "san-diego-county", name: "San Diego County", shortName: "San Diego", fips: "06073", seat: "San Diego", region: "Southern California" },
  { slug: "san-francisco-county", name: "San Francisco County", shortName: "San Francisco", fips: "06075", seat: "San Francisco", region: "Bay Area" },
  { slug: "san-joaquin-county", name: "San Joaquin County", shortName: "San Joaquin", fips: "06077", seat: "Stockton", region: "Central Valley" },
  { slug: "san-luis-obispo-county", name: "San Luis Obispo County", shortName: "San Luis Obispo", fips: "06079", seat: "San Luis Obispo", region: "Central Coast" },
  { slug: "san-mateo-county", name: "San Mateo County", shortName: "San Mateo", fips: "06081", seat: "Redwood City", region: "Bay Area" },
  { slug: "santa-barbara-county", name: "Santa Barbara County", shortName: "Santa Barbara", fips: "06083", seat: "Santa Barbara", region: "Central Coast" },
  { slug: "santa-clara-county", name: "Santa Clara County", shortName: "Santa Clara", fips: "06085", seat: "San Jose", region: "Bay Area" },
  { slug: "santa-cruz-county", name: "Santa Cruz County", shortName: "Santa Cruz", fips: "06087", seat: "Santa Cruz", region: "Central Coast" },
  { slug: "shasta-county", name: "Shasta County", shortName: "Shasta", fips: "06089", seat: "Redding", region: "Northern California" },
  { slug: "sierra-county", name: "Sierra County", shortName: "Sierra", fips: "06091", seat: "Downieville", region: "Sierra Nevada" },
  { slug: "siskiyou-county", name: "Siskiyou County", shortName: "Siskiyou", fips: "06093", seat: "Yreka", region: "Northern California" },
  { slug: "solano-county", name: "Solano County", shortName: "Solano", fips: "06095", seat: "Fairfield", region: "Bay Area" },
  { slug: "sonoma-county", name: "Sonoma County", shortName: "Sonoma", fips: "06097", seat: "Santa Rosa", region: "Bay Area" },
  { slug: "stanislaus-county", name: "Stanislaus County", shortName: "Stanislaus", fips: "06099", seat: "Modesto", region: "Central Valley" },
  { slug: "sutter-county", name: "Sutter County", shortName: "Sutter", fips: "06101", seat: "Yuba City", region: "Sacramento Valley" },
  { slug: "tehama-county", name: "Tehama County", shortName: "Tehama", fips: "06103", seat: "Red Bluff", region: "Northern California" },
  { slug: "trinity-county", name: "Trinity County", shortName: "Trinity", fips: "06105", seat: "Weaverville", region: "Northern California" },
  { slug: "tulare-county", name: "Tulare County", shortName: "Tulare", fips: "06107", seat: "Visalia", region: "Central Valley" },
  { slug: "tuolumne-county", name: "Tuolumne County", shortName: "Tuolumne", fips: "06109", seat: "Sonora", region: "Sierra Nevada" },
  { slug: "ventura-county", name: "Ventura County", shortName: "Ventura", fips: "06111", seat: "Ventura", region: "Southern California" },
  { slug: "yolo-county", name: "Yolo County", shortName: "Yolo", fips: "06113", seat: "Woodland", region: "Sacramento Valley" },
  { slug: "yuba-county", name: "Yuba County", shortName: "Yuba", fips: "06115", seat: "Marysville", region: "Sacramento Valley" },
];

export const ALL_COUNTIES: CountySeed[] = COUNTY_BASE.map((c) => ({
  ...c,
  isPublished: PUBLISHED.has(c.slug),
}));

export function findCounty(slug: string): CountySeed | undefined {
  return ALL_COUNTIES.find((c) => c.slug === slug);
}

export function publishedCounties(): CountySeed[] {
  return ALL_COUNTIES.filter((c) => c.isPublished);
}
