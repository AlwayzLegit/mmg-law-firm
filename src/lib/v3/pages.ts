/**
 * Registry of every page built from the "Redesign v3" design handoff.
 * One source of truth for routes, metadata, breadcrumbs, the sitemap and
 * the navigation menus. Existing URLs are preserved (their link equity
 * carries over); new guides use the slugs proposed in the handoff's SEO
 * notes. Titles omit the " | MMG Law Firm" suffix — the root layout's title
 * template adds it.
 */

export type V3Group =
  | "home"
  | "car"
  | "truck"
  | "moto"
  | "injury"
  | "results"
  | "firm"
  | "resource"
  | "legal";

export type V3PageMeta = {
  key: string;
  path: string;
  /** Short label for menus + breadcrumbs. */
  label: string;
  title: string;
  description: string;
  group: V3Group;
  /** Parent page key for the breadcrumb trail. */
  parent?: string;
  practiceArea?: string;
};

const P = (m: V3PageMeta) => m;

export const V3_PAGES: V3PageMeta[] = [
  P({ key: "home", path: "/", label: "Home", group: "home", title: "California Car, Truck & Motorcycle Accident Attorney", description: "Mihran M. Ghazaryan, Glendale-based California car, truck and motorcycle accident attorney. Clear answers, personal attention. Free consultation. English, Armenian, Russian." }),

  // Specialty hubs (existing URLs)
  // Exact specialty-hub metadata approved by the owner on October 18, 2026.
  P({ key: "car", path: "/practice-areas/car-accidents", label: "Car Accidents", group: "car", parent: "home", practiceArea: "car-accidents", title: "California Car Accident Lawyer", description: "Injured in a California car crash? MMG Law Firm helps with fault, insurance disputes and compensation for your injuries. Request a free consultation." }),
  P({ key: "truck", path: "/practice-areas/truck-accidents", label: "Truck Accidents", group: "truck", parent: "home", practiceArea: "truck-accidents", title: "California Truck Accident Lawyer", description: "Hurt in a California truck crash? Discuss trucking-company liability, evidence and injury compensation with MMG Law Firm. Request a free consultation." }),
  P({ key: "moto", path: "/practice-areas/motorcycle-accidents", label: "Motorcycle Accidents", group: "moto", parent: "home", practiceArea: "motorcycle-accidents", title: "California Motorcycle Accident Lawyer", description: "Injured riding in California? MMG Law Firm helps with motorcycle crash claims, shared fault and injury compensation. Request a free consultation." }),

  // Car accident guides
  P({ key: "rearend", path: "/rear-end-car-accident-lawyer", label: "Rear-End Car Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Rear-End Accident Lawyer", description: "Rear-ended in California? Discuss crash evidence, disputed fault and injury compensation with MMG Law Firm. Get a free consultation about your next steps." }),
  P({ key: "intersection", path: "/intersection-t-bone-accident-lawyer", label: "Intersection and T-Bone Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California T-Bone & Intersection Crash Lawyer", description: "Injured in a California intersection or T-bone crash? Review right of way, signal evidence and conflicting accounts with MMG Law Firm. Free consultation." }),
  P({ key: "multi", path: "/multi-vehicle-accident-lawyer", label: "Multi-Vehicle Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Multi-Vehicle Accident Lawyer", description: "Caught in a California multi-vehicle crash? Learn how impact sequences, disputed fault and multiple insurers affect your claim. MMG offers a free consultation." }),
  P({ key: "distract", path: "/distracted-driving-accident-lawyer", label: "Distracted-Driving Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Distracted-Driving Accident Lawyer", description: "Hurt by a distracted driver in California? Explore how video, witnesses and phone records may support your injury claim. Free consultation with MMG Law Firm." }),
  P({ key: "dui", path: "/drunk-driving-accident-lawyer", label: "Drunk-Driving Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Drunk-Driving Accident Lawyer", description: "Hit by a suspected drunk driver in California? Learn how civil claims, crash evidence and insurance recovery work. Ask MMG Law Firm for a free consultation." }),
  P({ key: "hitrun", path: "/hit-and-run-accident-lawyer", label: "Hit-and-Run Claims", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Hit-and-Run Accident Lawyer", description: "Injured in a California hit-and-run? Learn about reporting, evidence and possible uninsured motorist coverage. Contact MMG Law Firm for a free consultation." }),
  P({ key: "umuim", path: "/uninsured-underinsured-motorist-claims", label: "UM / UIM Claims", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Uninsured Motorist Claims", description: "Hit by an uninsured or underinsured driver in California? Review UM/UIM coverage, policy limits and release issues with MMG Law Firm. Free consultation." }),
  P({ key: "rideshare", path: "/practice-areas/rideshare-accidents", label: "Uber & Lyft Accidents", group: "car", parent: "car", practiceArea: "rideshare-accidents", title: "California Uber & Lyft Accident Lawyer", description: "Hurt in an Uber or Lyft crash in California? Discuss rideshare insurance, liability and injury compensation with MMG Law Firm. Free consultation." }),

  // Truck accident guides
  P({ key: "rollover", path: "/truck-rollover-accident-lawyer", label: "Truck Rollover Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Rollover Accident Lawyer", description: "Hurt in a California truck rollover? MMG Law Firm examines speed, loading, road conditions and vehicle stability to assess your claim. Free consultation." }),
  P({ key: "jackknife", path: "/jackknife-truck-accident-lawyer", label: "Jackknife Truck Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Jackknife Truck Accident Attorney", description: "Injured in a California jackknife truck crash? Review braking, cargo, road conditions and crash evidence with MMG Law Firm. Request a free consultation." }),
  P({ key: "underride", path: "/truck-underride-accident-lawyer", label: "Truck Underride Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Underride Accident Lawyer", description: "Injured in a California truck underride crash? MMG Law Firm reviews collision evidence, guard issues and your family’s needs. Request a free consultation." }),
  P({ key: "cargo", path: "/overloaded-truck-unsecured-cargo-accidents", label: "Overloaded Trucks and Cargo", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Overloaded Truck & Cargo Accident Lawyer", description: "Hurt by an overloaded truck or falling cargo in California? Discuss loading records, responsibility and injury claims with MMG Law Firm. Free consultation." }),
  P({ key: "brake", path: "/truck-brake-failure-accidents", label: "Truck Brake Failure", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Brake Failure Lawyer", description: "Injured in a California truck brake failure crash? MMG Law Firm reviews maintenance, inspections and defect reports to assess liability. Free consultation." }),
  P({ key: "delivery", path: "/delivery-truck-van-accident-lawyer", label: "Delivery Truck and Van Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Delivery Truck Accident Lawyer", description: "Hurt in a California delivery truck or van crash? MMG Law Firm reviews driver, employer and insurance responsibility. Request a free attorney consultation." }),
  P({ key: "truckliab", path: "/trucking-company-liability", label: "Trucking Company Liability", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Trucking Company Liability in California", description: "Explore how a trucking company may share liability for a California crash through driver conduct, maintenance or company decisions. Talk with MMG Law Firm." }),
  P({ key: "truckev", path: "/truck-accident-evidence-preservation", label: "Truck Evidence Preservation", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Truck Accident Evidence Preservation", description: "Learn which truck crash records may matter, from electronic logs and vehicle data to video and inspections. Discuss evidence preservation with MMG Law Firm." }),

  // Motorcycle accident guides
  P({ key: "lanesplit", path: "/california-lane-splitting-accident-lawyer", label: "Lane-Splitting Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Lane-Splitting Accident Lawyer", description: "Injured while lane splitting in California? MMG Law Firm reviews rider and driver conduct, crash evidence and disputed fault. Request a free consultation." }),
  P({ key: "leftturn", path: "/left-turn-motorcycle-accident-lawyer", label: "Left-Turn Motorcycle Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Left-Turn Motorcycle Crash Lawyer", description: "Hurt when a driver turned across your motorcycle in California? Discuss right of way, visibility and crash evidence with MMG Law Firm. Free consultation." }),
  P({ key: "lanechange", path: "/motorcycle-lane-change-accident-lawyer", label: "Lane-Change and Blind-Spot Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "CA Motorcycle Lane-Change Accident Lawyer", description: "Injured in a California motorcycle lane-change crash? Discuss blind spots, vehicle movements and fault evidence with MMG Law Firm. Free consultation." }),
  P({ key: "passenger", path: "/motorcycle-passenger-injury-claims", label: "Motorcycle Passenger Claims", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Motorcycle Passenger Injury Lawyer", description: "Injured as a motorcycle passenger in California? Discuss driver responsibility, insurance coverage and your own claim with MMG Law Firm. Free consultation." }),
  P({ key: "motoprop", path: "/motorcycle-property-damage-claims", label: "Motorcycle Damage and Gear Claims", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Motorcycle Property Damage Claims", description: "Review California motorcycle damage, gear losses, total-loss offers and storage costs. Ask MMG Law Firm what property-claim assistance is available." }),

  // Serious injuries (existing URLs + new guides)
  P({ key: "catastrophic", path: "/practice-areas/catastrophic-injury", label: "Catastrophic Injuries", group: "injury", parent: "home", practiceArea: "catastrophic-injury", title: "California Catastrophic Injury Lawyer", description: "Seriously injured in California? Discuss brain injuries, spinal cord damage, future care and injury compensation with MMG Law Firm. Free consultation." }),
  P({ key: "tbi", path: "/traumatic-brain-injury-after-accident", label: "Traumatic Brain Injury", group: "injury", parent: "catastrophic", practiceArea: "catastrophic-injury", title: "California Traumatic Brain Injury Lawyer", description: "Facing a brain injury after a California accident? MMG Law Firm reviews medical evidence, lasting effects and future care needs. Request a free consultation." }),
  P({ key: "sci", path: "/spinal-cord-injury-paralysis-lawyer", label: "Spinal Cord Injury", group: "injury", parent: "catastrophic", practiceArea: "catastrophic-injury", title: "California Spinal Cord Injury Lawyer", description: "A spinal cord injury can change your future. Discuss California accident claims, long-term care and financial losses with MMG Law Firm. Free consultation." }),
  P({ key: "wrongful", path: "/practice-areas/wrongful-death", label: "Wrongful Death", group: "injury", parent: "home", practiceArea: "wrongful-death", title: "California Fatal Accident Lawyer", description: "Lost a loved one in a California vehicle accident? Discuss wrongful death claims, family eligibility and potential losses with MMG Law Firm. Free consultation." }),

  // Case results
  P({ key: "results", path: "/case-results", label: "Case Results", group: "results", parent: "home", title: "Case Results: Verdicts and Settlements", description: "Understand the facts behind a case outcome, how to read settlements and verdicts, and what to ask about your own California accident claim." }),
  P({ key: "carresults", path: "/car-accident-case-results", label: "Car Accident Results", group: "results", parent: "results", practiceArea: "car-accidents", title: "California Car Accident Case Results", description: "Explore MMG Law Firm car accident outcomes and the evidence behind them. Learn why case facts and net recovery matter. Past results do not guarantee outcomes." }),
  P({ key: "truckresults", path: "/truck-accident-case-results", label: "Truck Accident Results", group: "results", parent: "results", practiceArea: "truck-accidents", title: "California Truck Accident Case Results", description: "Learn how truck accident outcomes are evaluated, from commercial parties to injury evidence. MMG Law Firm has no published results on this page yet." }),
  P({ key: "motoresults", path: "/motorcycle-accident-case-results", label: "Motorcycle Accident Results", group: "results", parent: "results", practiceArea: "motorcycle-accidents", title: "California Motorcycle Accident Case Results", description: "Review evidence, rider fault disputes and motorcycle settlement context. MMG Law Firm has no published results on this page. Free case evaluation." }),

  // The firm
  P({ key: "attorney", path: "/attorneys/mihran-ghazaryan", label: "Our Attorney", group: "firm", parent: "home", title: "Mihran M. Ghazaryan — California Personal Injury Attorney", description: "Meet Mihran M. Ghazaryan, the Glendale-based California personal injury attorney who will guide your car, truck or motorcycle accident claim. English, Armenian, Russian." }),
  P({ key: "about", path: "/about-the-firm", label: "About the Firm", group: "firm", parent: "home", title: "About MMG Law Firm", description: "Meet MMG Law Firm, a Glendale practice serving injured Californians. Learn about direct attorney involvement, our approach, case costs, and a free consultation." }),
  P({ key: "reviews", path: "/reviews", label: "Reviews", group: "firm", parent: "home", title: "Client Reviews and Testimonials", description: "Read selected MMG Law Firm review excerpts, explore communication and client-service questions, and request a free California accident case evaluation." }),
  P({ key: "fees", path: "/fees-and-costs", label: "Fees & Costs", group: "firm", parent: "home", title: "Attorney Fees & Case Costs", description: "Understand MMG's accident case fees and costs. No recovery, no attorney fees or case expenses. Get a free California case evaluation." }),
  P({ key: "glendale", path: "/locations/los-angeles-county/glendale", label: "Glendale Office", group: "firm", parent: "home", title: "Glendale Personal Injury Lawyer", description: "Injured in Glendale? MMG Law Firm handles car crashes, falls and other personal injury claims. Discuss your options in a free attorney consultation." }),
  P({ key: "consult", path: "/contact", label: "Contact", group: "firm", parent: "home", title: "Contact — Free Consultation", description: "Request a free, confidential case evaluation from MMG Law Firm in Glendale. Call or send a short description of what happened. English, Armenian, Russian." }),

  // Resources
  P({ key: "resources", path: "/resources", label: "Accident Resources", group: "resource", parent: "home", title: "California Accident Resources", description: "Official California accident resources, a comparative-fault illustration, and guides to deadlines, claims, compensation and settlements from MMG Law Firm." }),
  P({ key: "faqs", path: "/accident-lawyer-faqs", label: "Accident FAQs", group: "resource", parent: "resources", title: "California Accident Lawyer FAQs", description: "Get answers to California accident claim questions about hiring a lawyer, fees, records, insurance and next steps. MMG Law Firm offers a free consultation." }),
  P({ key: "after", path: "/what-to-do-after-california-accident", label: "After an Accident", group: "resource", parent: "resources", title: "What to Do After a Car Accident in CA", description: "After a California car, truck or motorcycle crash, review safety steps, evidence, reporting and insurance issues. Get a free MMG Law Firm consultation." }),
  P({ key: "deadlines", path: "/california-accident-claim-deadlines", label: "Claim Deadlines", group: "resource", parent: "resources", title: "California Injury Claim Deadlines", description: "Learn about California injury lawsuit deadlines, government claims and exceptions after an accident. Ask MMG Law Firm to review the timing of your claim." }),
  P({ key: "process", path: "/how-an-accident-claim-works", label: "How a Claim Works", group: "resource", parent: "resources", title: "California Personal Injury Claim Process", description: "Follow a California accident claim from consultation and investigation through negotiation, possible litigation and resolution. Learn what to expect with MMG." }),
  P({ key: "comp", path: "/compensation-after-a-california-accident", label: "Compensation", group: "resource", parent: "resources", title: "California Accident Compensation", description: "Explore compensation after a California accident, including medical costs, lost income and pain and suffering. Discuss evidence and losses with MMG Law Firm." }),
  P({ key: "settle", path: "/insurance-settlement-offers-releases", label: "Settlement Offers and Releases", group: "resource", parent: "resources", title: "California Settlement Offers & Releases", description: "Received a California accident settlement offer? Learn how releases, medical bills and fees affect what you keep. Review your options with MMG Law Firm." }),
  P({ key: "fault", path: "/partial-fault-california-accident", label: "Partial Fault", group: "resource", parent: "resources", title: "California Comparative Negligence & Fault", description: "Blamed for part of a California accident? Learn how comparative negligence and supporting evidence can affect compensation. Discuss your case with MMG Law Firm." }),
  P({ key: "bills", path: "/medical-bills-liens-treatment-costs", label: "Medical Bills and Liens", group: "resource", parent: "resources", title: "California Accident Medical Bills & Liens", description: "Understand medical bills, treatment liens and repayment claims after a California accident. Learn what to review before settling your case with MMG Law Firm." }),

  // Legal
  P({ key: "privacy", path: "/legal/privacy", label: "Privacy Policy", group: "legal", parent: "home", title: "Privacy Policy", description: "How MMG Law Firm collects, uses and protects information submitted through this website, including your California privacy rights." }),
  P({ key: "disclosures", path: "/legal/disclaimer", label: "Legal Disclaimer", group: "legal", parent: "home", title: "Legal Disclaimer", description: "MMG Law Firm legal disclaimer regarding attorney advertising, the formation of an attorney-client relationship, and case results." }),
];

export const V3_BY_KEY: Record<string, V3PageMeta> = Object.fromEntries(
  V3_PAGES.map((p) => [p.key, p]),
);
export const V3_BY_PATH: Record<string, V3PageMeta> = Object.fromEntries(
  V3_PAGES.map((p) => [p.path, p]),
);

/** Root-level guide pages served by app/(marketing)/[guide]/page.tsx. */
export const V3_GUIDES = V3_PAGES.filter(
  (p) => /^\/[^/]+$/.test(p.path) && !["/contact", "/reviews", "/case-results"].includes(p.path),
);

/** Breadcrumb trail (Home → … → page) for a registry page. */
export function v3Crumbs(key: string): { name: string; path: string }[] {
  const trail: V3PageMeta[] = [];
  let cur: V3PageMeta | undefined = V3_BY_KEY[key];
  while (cur) {
    trail.unshift(cur);
    cur = cur.parent ? V3_BY_KEY[cur.parent] : undefined;
  }
  return trail.map((p) => ({ name: p.label, path: p.path }));
}
