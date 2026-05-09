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
    lawyerPhrase: "premises liability lawyer",
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
    lawyerPhrase: "wrongful death attorney",
    icon: "HeartCrack",
    intro:
      "If a loved one was lost to another's negligence, California gives surviving family members the right to seek accountability. We approach these matters with the care they require.",
    displayOrder: 70,
  },
  {
    slug: "dog-bites",
    name: "Dog Bites",
    shortName: "Dog Bite",
    nounSingular: "dog bite injury",
    nounPlural: "dog bite injuries",
    lawyerPhrase: "dog bite attorney",
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
];

export function findPracticeArea(slug: string): PracticeArea | undefined {
  return PRACTICE_AREAS.find((p) => p.slug === slug);
}
