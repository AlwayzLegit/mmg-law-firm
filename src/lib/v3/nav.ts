/**
 * Site navigation for the v3 design. The three specialties (car, truck,
 * motorcycle) lead the Accident Cases menu, each with its guide pages, so
 * every hub and guide gets a crawlable link from every page.
 */
import { TIER_1_LOCATIONS } from "@/lib/data/locations";

import { V3_BY_KEY, V3_PAGES, type V3Group } from "./pages";

export type NavLink = { label: string; href: string; description?: string };

const link = (key: string, description?: string): NavLink => ({
  label: V3_BY_KEY[key].label,
  href: V3_BY_KEY[key].path,
  description,
});

const guidesOf = (group: V3Group, hub: string) =>
  V3_PAGES.filter((p) => p.group === group && p.key !== hub).map((p) => ({
    label: p.label,
    href: p.path,
  }));

export type Specialty = {
  key: "car" | "truck" | "moto";
  hub: NavLink;
  icon: string;
  guides: NavLink[];
  results: NavLink;
};

export const SPECIALTIES: Specialty[] = [
  {
    key: "car",
    hub: link("car", "Injuries involving passenger vehicles"),
    icon: "uploads/moto-icons/car.svg",
    guides: guidesOf("car", "car"),
    results: link("carresults"),
  },
  {
    key: "truck",
    hub: link("truck", "Commercial vehicle collisions"),
    icon: "uploads/moto-icons/truck.svg",
    guides: guidesOf("truck", "truck"),
    results: link("truckresults"),
  },
  {
    key: "moto",
    hub: link("moto", "Guidance for injured riders"),
    icon: "uploads/moto-icons/motorcycle.svg",
    guides: guidesOf("moto", "moto"),
    results: link("motoresults"),
  },
];

/** Other injury matters the firm handles (existing practice-area pages). */
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

export const ABOUT_LINKS: NavLink[] = [
  link("about"),
  link("attorney"),
  link("reviews"),
  link("results"),
  link("fees"),
  link("glendale"),
];

export const RESOURCE_LINKS: NavLink[] = [
  link("resources"),
  link("faqs"),
  link("after"),
  link("deadlines"),
  link("process"),
  link("comp"),
  link("settle"),
  link("fault"),
  link("bills"),
  link("umuim"),
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

export const CITY_LINKS: NavLink[] = MENU_CITY_SLUGS.map((slug) => {
  const c = TIER_1_LOCATIONS.find((l) => l.citySlug === slug)!;
  return { label: c.cityName, href: `/locations/${c.countySlug}/${c.citySlug}` };
});

export const LEGAL_LINKS: NavLink[] = [
  link("privacy"),
  link("disclosures"),
  { label: "Accessibility", href: "/legal/accessibility" },
  { label: "Your CCPA Rights", href: "/legal/ccpa" },
];
