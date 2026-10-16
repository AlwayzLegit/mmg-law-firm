/**
 * Client-side form labels only. Keep descriptive/SEO copy in practice-areas.ts
 * on the server. The parity test checks every label, slug and ordering against
 * that authoritative catalog so this small projection cannot silently drift.
 */
export const PRACTICE_AREA_OPTIONS = [
  { slug: "car-accidents", name: "Car Accidents", shortName: "Car Accident" },
  {
    slug: "truck-accidents",
    name: "Truck Accidents",
    shortName: "Truck Accident",
  },
  {
    slug: "motorcycle-accidents",
    name: "Motorcycle Accidents",
    shortName: "Motorcycle Accident",
  },
  {
    slug: "pedestrian-accidents",
    name: "Pedestrian Accidents",
    shortName: "Pedestrian Accident",
  },
  {
    slug: "bicycle-accidents",
    name: "Bicycle Accidents",
    shortName: "Bicycle Accident",
  },
  { slug: "slip-and-fall", name: "Slip and Fall", shortName: "Slip and Fall" },
  {
    slug: "wrongful-death",
    name: "Wrongful Death",
    shortName: "Wrongful Death",
  },
  { slug: "dog-bites", name: "Dog Bites", shortName: "Dog Bite" },
  {
    slug: "rideshare-accidents",
    name: "Uber & Lyft Accidents",
    shortName: "Rideshare Accident",
  },
  {
    slug: "catastrophic-injury",
    name: "Catastrophic Injury",
    shortName: "Catastrophic Injury",
  },
  { slug: "employment-law", name: "Employment Law", shortName: "Employment" },
  {
    slug: "wrongful-termination",
    name: "Wrongful Termination",
    shortName: "Wrongful Termination",
  },
  {
    slug: "workplace-discrimination",
    name: "Workplace Discrimination",
    shortName: "Discrimination",
  },
  {
    slug: "sexual-harassment",
    name: "Sexual Harassment",
    shortName: "Sexual Harassment",
  },
  {
    slug: "wage-and-hour",
    name: "Unpaid Wages & Overtime",
    shortName: "Wage & Hour",
  },
] as const;

/** Preserve the existing design-label matching and first-match behavior. */
export function practiceFromLabel(label: string): string | undefined {
  const l = label.toLowerCase();
  const hit = PRACTICE_AREA_OPTIONS.find(
    (p) =>
      l.includes(p.shortName.toLowerCase()) ||
      l.includes(p.name.toLowerCase().replace(/ accidents?$/, "")),
  );
  return hit?.slug;
}
