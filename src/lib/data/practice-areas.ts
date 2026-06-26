/**
 * Static seed for practice areas. The Supabase `practice_areas` table mirrors
 * this shape; until the DB is wired, marketing components read from this list.
 *
 * Keep slugs URL-stable — they are part of the canonical SEO URL pattern.
 */

export type PracticeArea = {
  slug: string;
  name: string;
  shortName: string;
  nounSingular: string;
  nounPlural: string;
  lawyerPhrase: string;
  /** Lucide icon name. Render via dynamic lookup in the grid. */
  icon: string;
  intro: string;
  displayOrder: number;
  /**
   * Practice family. Most areas are personal-injury ("injury"); the templates
   * default to injury framing (damages = medical/lost wages/pain, two-year
   * CCP §335.1 deadline, "Injured in …?" CTAs). "employment" swaps those for
   * employment-appropriate copy (back pay/front pay/emotional distress, CRD/
   * FEHA deadlines, workplace-dispute CTAs). Undefined ⇒ "injury".
   */
  category?: "injury" | "employment";
  /**
   * Optional override for the closing CTA-band heading on the practice hub.
   * The default `Injured in a ${nounSingular}?` reads wrong for some areas
   * (e.g. "Injured in a wrongful death?"), so those set an explicit prompt.
   */
  ctaHeading?: string;
};

export const PRACTICE_AREAS: PracticeArea[] = [
  {
    slug: "car-accidents",
    name: "Car Accidents",
    shortName: "Car Accident",
    nounSingular: "car accident",
    nounPlural: "car accidents",
    lawyerPhrase: "car accident lawyer",
    icon: "Car",
    intro:
      "Rear-end, intersection, and freeway collisions across California. We handle medical liens, property damage, and insurance pushback on your behalf.",
    displayOrder: 10,
  },
  {
    slug: "truck-accidents",
    name: "Truck Accidents",
    shortName: "Truck Accident",
    nounSingular: "truck accident",
    nounPlural: "truck accidents",
    lawyerPhrase: "truck accident lawyer",
    icon: "Truck",
    intro:
      "Commercial truck crashes involve federal motor-carrier rules, multiple insurers, and aggressive defense teams. We move fast to preserve evidence.",
    displayOrder: 20,
  },
  {
    slug: "motorcycle-accidents",
    name: "Motorcycle Accidents",
    shortName: "Motorcycle Accident",
    nounSingular: "motorcycle accident",
    nounPlural: "motorcycle accidents",
    lawyerPhrase: "motorcycle accident lawyer",
    icon: "Bike",
    intro:
      "Riders face unfair bias from insurers and juries. We push back with crash reconstruction and a clear narrative of how the collision occurred.",
    displayOrder: 30,
  },
  {
    slug: "pedestrian-accidents",
    name: "Pedestrian Accidents",
    shortName: "Pedestrian Accident",
    nounSingular: "pedestrian accident",
    nounPlural: "pedestrian accidents",
    lawyerPhrase: "pedestrian accident lawyer",
    icon: "PersonStanding",
    intro:
      "Crosswalk strikes, parking-lot collisions, and unsafe-roadway claims. Pedestrian injuries are typically severe — we treat the case with the urgency it deserves.",
    displayOrder: 40,
  },
  {
    slug: "bicycle-accidents",
    name: "Bicycle Accidents",
    shortName: "Bicycle Accident",
    nounSingular: "bicycle accident",
    nounPlural: "bicycle accidents",
    lawyerPhrase: "bicycle accident lawyer",
    icon: "BikeIcon",
    intro:
      "Door-zone crashes, hit-from-behind, and unsafe-lane-change collisions. We document the bike-specific facts insurers prefer to ignore.",
    displayOrder: 50,
  },
  {
    slug: "slip-and-fall",
    name: "Slip and Fall",
    shortName: "Slip and Fall",
    nounSingular: "slip and fall",
    nounPlural: "slip and fall accidents",
    // Semrush US: "slip and fall lawyer" 90.5k/mo vs "premises liability
    // lawyer" 27.1k — target the higher-volume term in titles/H1s.
    lawyerPhrase: "slip and fall lawyer",
    icon: "TriangleAlert",
    intro:
      "Wet floors, uneven walkways, broken stairs, and inadequate security. Premises liability cases turn on notice — we build the timeline before evidence disappears.",
    displayOrder: 60,
  },
  {
    slug: "wrongful-death",
    name: "Wrongful Death",
    shortName: "Wrongful Death",
    nounSingular: "wrongful death",
    nounPlural: "wrongful death matters",
    // Semrush US: "wrongful death lawyer" 135k/mo vs "wrongful death
    // attorney" 110k — "lawyer" leads in titles/H1s; "attorney" still
    // appears in body/meta for keyword variety.
    lawyerPhrase: "wrongful death lawyer",
    icon: "HeartCrack",
    intro:
      "If a loved one was lost to another's negligence, California gives surviving family members the right to seek accountability. We approach these matters with the care they require.",
    displayOrder: 70,
    ctaHeading: "Lost a loved one to negligence?",
  },
  {
    slug: "dog-bites",
    name: "Dog Bites",
    shortName: "Dog Bite",
    nounSingular: "dog bite injury",
    nounPlural: "dog bite injuries",
    // Semrush US: "dog bite lawyer" 49.5k/mo vs "dog bite attorney" 33.1k.
    lawyerPhrase: "dog bite lawyer",
    icon: "Dog",
    intro:
      "California is a strict-liability state for dog bites. Owners are responsible for injuries even on a first incident — we work directly with the owner's homeowners or renters insurer.",
    displayOrder: 80,
  },
  {
    slug: "rideshare-accidents",
    name: "Uber & Lyft Accidents",
    shortName: "Rideshare Accident",
    nounSingular: "rideshare accident",
    nounPlural: "rideshare accidents",
    lawyerPhrase: "rideshare accident lawyer",
    icon: "Smartphone",
    intro:
      "Uber and Lyft cases involve layered insurance policies that change depending on the driver's app status at the moment of the crash. We know how to navigate them.",
    displayOrder: 90,
  },
  {
    slug: "catastrophic-injury",
    name: "Catastrophic Injury",
    shortName: "Catastrophic Injury",
    nounSingular: "catastrophic injury",
    nounPlural: "catastrophic injuries",
    // Semrush US: "catastrophic injury lawyer"/"attorney" both rank; "lawyer"
    // leads our title/H1 pattern, "attorney" appears in body/meta for variety.
    lawyerPhrase: "catastrophic injury lawyer",
    icon: "Brain",
    intro:
      "Traumatic brain and spinal-cord injuries, severe burns, amputations, and other permanent harm. These claims turn on life-care planning and expert proof of lifelong cost — we build them for the long term.",
    displayOrder: 35,
    category: "injury",
    ctaHeading: "Living with a catastrophic injury?",
  },
  {
    slug: "employment-law",
    name: "Employment Law",
    shortName: "Employment",
    nounSingular: "workplace matter",
    nounPlural: "workplace matters",
    // Semrush US gap vs. local competitors: "wrongful termination" + "employment
    // lawyer" + discrimination terms. "employment lawyer" anchors title/H1;
    // wrongful-termination/discrimination phrasing lives in body/meta.
    lawyerPhrase: "employment lawyer",
    icon: "Briefcase",
    intro:
      "Wrongful termination, workplace discrimination and harassment, retaliation, and unpaid wages. California gives employees some of the nation's strongest protections — we hold employers to them.",
    displayOrder: 100,
    category: "employment",
    ctaHeading: "Mistreated at work?",
  },
];

export function findPracticeArea(slug: string): PracticeArea | undefined {
  return PRACTICE_AREAS.find((p) => p.slug === slug);
}

/** Title-cased money keyword for titles/H1s, e.g. "Car Accident Lawyer",
 *  "Slip and Fall Lawyer". Built from `lawyerPhrase` so on-page copy targets
 *  the term people actually search. Connector words (and/of/the) stay
 *  lowercase unless they lead the phrase, so it reads as a natural headline. */
export function lawyerPhraseTitle(area: PracticeArea): string {
  const small = new Set(["and", "of", "the"]);
  return area.lawyerPhrase
    .split(" ")
    .map((word, i) =>
      i > 0 && small.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
