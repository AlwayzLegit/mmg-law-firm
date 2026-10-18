/**
 * Site navigation for the v3 design. The three specialties (car, truck,
 * motorcycle) are top-level header items, each with its own mega menu: hub,
 * crash-type guides, case results and the top city × specialty pages. Every
 * hub and guide therefore gets a crawlable link from every page, in the header
 * and again in the footer.
 */
import { TIER_1_LOCATIONS } from "@/lib/data/locations";

import { V3_BY_KEY } from "./pages";

export type NavLink = { label: string; href: string; description?: string };

const link = (key: string, description?: string): NavLink => ({
  label: V3_BY_KEY[key].label,
  href: V3_BY_KEY[key].path,
  description,
});

const links = (...keys: string[]): NavLink[] => keys.map((k) => link(k));

export type SpecialtyKey = "car" | "truck" | "moto";

export type Specialty = {
  key: SpecialtyKey;
  /** Short header label, e.g. "Car Accidents". */
  hub: NavLink;
  /** Keyword anchor used on the mega-menu hub card and in the footer. */
  hubTitle: string;
  icon: string;
  /** Guide groups shown as columns in the mega menu. */
  columns: { title: string; links: NavLink[] }[];
  /** All guides, flat (footer, active-state matching). */
  guides: NavLink[];
  results: NavLink;
  /** City × specialty pages. */
  citiesTitle: string;
  cities: NavLink[];
  /** Consultation strip at the bottom of the mega menu. */
  cta: string;
};

const PRACTICE_SLUG: Record<SpecialtyKey, string> = {
  car: "car-accidents",
  truck: "truck-accidents",
  moto: "motorcycle-accidents",
};

function cityLink(citySlug: string): NavLink {
  const c = TIER_1_LOCATIONS.find((l) => l.citySlug === citySlug);
  if (!c) throw new Error(`Unknown tier-1 city slug in nav: ${citySlug}`);
  return { label: c.cityName, href: `/locations/${c.countySlug}/${c.citySlug}` };
}

function cityPracticeLinks(key: SpecialtyKey, citySlugs: string[]): NavLink[] {
  return citySlugs.map((slug) => {
    const c = cityLink(slug);
    return { label: c.label, href: `${c.href}/${PRACTICE_SLUG[key]}` };
  });
}

function specialty(
  key: SpecialtyKey,
  hubKey: string,
  description: string,
  icon: string,
  columns: { title: string; keys: string[] }[],
  resultsKey: string,
  citiesTitle: string,
  citySlugs: string[],
  cta: string,
): Specialty {
  const cols = columns.map((c) => ({ title: c.title, links: links(...c.keys) }));
  return {
    key,
    hub: link(hubKey, description),
    hubTitle: V3_BY_KEY[hubKey].title,
    icon,
    columns: cols,
    guides: cols.flatMap((c) => c.links),
    results: link(resultsKey),
    citiesTitle,
    cities: cityPracticeLinks(key, citySlugs),
    cta,
  };
}

export const SPECIALTIES: Specialty[] = [
  specialty(
    "car",
    "car",
    "Injuries involving passenger vehicles",
    "uploads/moto-icons/car.svg",
    [
      { title: "Types of car accidents", keys: ["rearend", "intersection", "multi", "distract", "dui"] },
      { title: "Coverage and claims", keys: ["hitrun", "umuim", "rideshare"] },
    ],
    "carresults",
    "Car accident lawyer near you",
    ["glendale", "los-angeles", "burbank", "pasadena"],
    "Injured in a car crash?",
  ),
  specialty(
    "truck",
    "truck",
    "Commercial vehicle collisions",
    "uploads/moto-icons/truck.svg",
    [
      { title: "Types of truck accidents", keys: ["rollover", "jackknife", "underride", "cargo", "brake", "delivery"] },
      { title: "Liability and evidence", keys: ["truckliab", "truckev"] },
    ],
    "truckresults",
    "Truck accident lawyer near you",
    ["glendale", "los-angeles", "long-beach", "san-bernardino"],
    "Hurt in a commercial truck crash?",
  ),
  specialty(
    "moto",
    "moto",
    "Guidance for injured riders",
    "uploads/moto-icons/motorcycle.svg",
    [
      { title: "Types of motorcycle accidents", keys: ["lanesplit", "leftturn", "lanechange"] },
      { title: "Rider claims", keys: ["passenger", "motoprop"] },
    ],
    "motoresults",
    "Motorcycle accident lawyer near you",
    ["glendale", "los-angeles", "pasadena", "san-diego"],
    "Injured riding?",
  ),
];

/** Other injury matters the firm handles (footer + Resources menu). */
export const OTHER_CASES: NavLink[] = [
  link("catastrophic"),
  link("tbi"),
  link("sci"),
  link("wrongful"),
  { label: "Pedestrian Accidents", href: "/practice-areas/pedestrian-accidents" },
  { label: "Bicycle Accidents", href: "/practice-areas/bicycle-accidents" },
  { label: "Slip and Fall", href: "/practice-areas/slip-and-fall" },
  { label: "Dog Bites", href: "/practice-areas/dog-bites" },
  { label: "Employment Law", href: "/practice-areas/employment-law" },
  { label: "All practice areas", href: "/practice-areas" },
];

export const OTHER_CASES_LINK: NavLink = {
  label: "Other injury cases we handle",
  href: "/practice-areas",
};

export const ABOUT_LINKS: NavLink[] = [
  link("attorney"),
  link("about"),
  link("reviews"),
  link("results"),
  link("fees"),
  link("glendale"),
  link("consult"),
];

export const RESOURCE_LINKS: NavLink[] = [
  link("resources"),
  link("after"),
  link("deadlines"),
  link("process"),
  link("comp"),
  link("settle"),
  link("fault"),
  link("bills"),
  link("faqs"),
];

const MENU_CITY_SLUGS = [
  "glendale",
  "los-angeles",
  "burbank",
  "pasadena",
  "long-beach",
  "santa-monica",
  "beverly-hills",
  "anaheim",
  "irvine",
  "riverside",
  "san-diego",
  "sacramento",
];

export const CITY_LINKS: NavLink[] = MENU_CITY_SLUGS.map(cityLink);

export const LEGAL_LINKS: NavLink[] = [
  link("privacy"),
  link("disclosures"),
  { label: "Accessibility", href: "/legal/accessibility" },
  { label: "Your CCPA Rights", href: "/legal/ccpa" },
];
