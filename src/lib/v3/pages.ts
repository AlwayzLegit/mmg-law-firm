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
  // TODO(human): attorney review required — the owner chose "Best …" titles and
  // "Top rated …" descriptions for the three specialty hubs (CRPC 7.1 treats
  // unsubstantiated superlatives as potentially misleading).
  P({ key: "car", path: "/practice-areas/car-accidents", label: "Car Accidents", group: "car", parent: "home", practiceArea: "car-accidents", title: "Best Car Accident Lawyer", description: "Top rated Car Accident Lawyer Can Help · Free Consultation, No Upfront Fees · No Recovery, No Attorney Fees · Focus on Recovery, We Handle the Rest." }),
  P({ key: "truck", path: "/practice-areas/truck-accidents", label: "Truck Accidents", group: "truck", parent: "home", practiceArea: "truck-accidents", title: "Best Truck Accident Lawyer", description: "Top rated Truck Accident Lawyer Can Help · Free Consultation, No Upfront Fees · We Take On Trucking Companies · Focus on Recovery, We Handle the Rest." }),
  P({ key: "moto", path: "/practice-areas/motorcycle-accidents", label: "Motorcycle Accidents", group: "moto", parent: "home", practiceArea: "motorcycle-accidents", title: "Best Motorcycle Accident Lawyer", description: "Top rated Motorcycle Accident Lawyer Can Help · Free Consultation, No Upfront Fees · Lane-Splitting Claims Handled · Focus on Recovery, We Handle the Rest." }),

  // Car accident guides
  P({ key: "rearend", path: "/rear-end-car-accident-lawyer", label: "Rear-End Car Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Rear-End Car Accident Lawyer", description: "Injured in a California rear-end crash? Learn about disputed fault, injury evidence, insurance, and compensation. Contact MMG for a free case evaluation." }),
  P({ key: "intersection", path: "/intersection-t-bone-accident-lawyer", label: "Intersection and T-Bone Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California T-Bone & Intersection Accident Lawyer", description: "Injured in a California intersection or T-bone crash? Understand signal disputes, right of way, witnesses, and injury evidence. Free MMG case evaluation." }),
  P({ key: "multi", path: "/multi-vehicle-accident-lawyer", label: "Multi-Vehicle Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Multi-Vehicle Accident Lawyer", description: "Injured in a California chain-reaction crash? Learn how fault, impact sequence, and multiple insurers affect your claim. Free MMG case evaluation." }),
  P({ key: "distract", path: "/distracted-driving-accident-lawyer", label: "Distracted-Driving Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Distracted-Driving Accident Lawyer", description: "Injured by a distracted driver in California? Learn how phone records, video, and witnesses may help prove your claim. Free MMG case evaluation." }),
  P({ key: "dui", path: "/drunk-driving-accident-lawyer", label: "Drunk-Driving Accidents", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Drunk-Driving Accident Lawyer", description: "Injured by an impaired driver in California? Learn about civil claims, evidence, compensation, restitution, and insurance. Free MMG case evaluation." }),
  P({ key: "hitrun", path: "/hit-and-run-accident-lawyer", label: "Hit-and-Run Claims", group: "car", parent: "car", practiceArea: "car-accidents", title: "California Hit-and-Run Accident Lawyer", description: "Learn about California hit-and-run evidence, reporting deadlines, and possible insurance coverage. Contact MMG Law Firm for a free case evaluation." }),
  P({ key: "umuim", path: "/uninsured-underinsured-motorist-claims", label: "UM / UIM Claims", group: "car", parent: "car", practiceArea: "car-accidents", title: "California UM & UIM Claims", description: "Understand California uninsured and underinsured motorist claims, policy limits, deadlines, and settlement issues. Request a free MMG case evaluation." }),
  P({ key: "rideshare", path: "/practice-areas/rideshare-accidents", label: "Uber & Lyft Accidents", group: "car", parent: "car", practiceArea: "rideshare-accidents", title: "California Uber & Lyft Accident Lawyer", description: "Injured in a California Uber or Lyft crash? Understand driver status, insurance limits, evidence, and next steps. Request a free MMG case evaluation." }),

  // Truck accident guides
  P({ key: "rollover", path: "/truck-rollover-accident-lawyer", label: "Truck Rollover Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Rollover Accident Lawyer", description: "Injured in a California truck rollover? Learn how speed, cargo, road conditions, and stability evidence may affect your claim. Free MMG case evaluation." }),
  P({ key: "jackknife", path: "/jackknife-truck-accident-lawyer", label: "Jackknife Truck Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Jackknife Truck Accident Lawyer", description: "Injured in a California jackknife truck crash? Learn how braking, road conditions, and vehicle evidence may affect your claim. Free MMG case evaluation." }),
  P({ key: "underride", path: "/truck-underride-accident-lawyer", label: "Truck Underride Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Underride Accident Lawyer", description: "Injured in a California truck underride crash? Learn about guard evidence, vehicle inspections, and serious injury claims. Free MMG case evaluation." }),
  P({ key: "cargo", path: "/overloaded-truck-unsecured-cargo-accidents", label: "Overloaded Trucks and Cargo", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Overloaded Truck & Unsecured Cargo Accident Lawyer", description: "Injured by a shifting load or falling truck cargo in California? Learn about loading responsibility, evidence, and your options. Free MMG case evaluation." }),
  P({ key: "brake", path: "/truck-brake-failure-accidents", label: "Truck Brake Failure", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Truck Brake Failure Lawyer", description: "Injured in a California truck crash involving brake failure? Learn how defects, maintenance records, and responsibility are investigated. Free MMG consultation." }),
  P({ key: "delivery", path: "/delivery-truck-van-accident-lawyer", label: "Delivery Truck and Van Accidents", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "California Delivery Truck & Van Accident Lawyer", description: "Injured in a California delivery truck or van accident? Understand company liability, insurance, and evidence to preserve. Free MMG case evaluation." }),
  P({ key: "truckliab", path: "/trucking-company-liability", label: "Trucking Company Liability", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Trucking Company Liability in California", description: "Learn when a trucking company may be liable for a California crash, what evidence matters, and how MMG can help. Request a free case evaluation." }),
  P({ key: "truckev", path: "/truck-accident-evidence-preservation", label: "Truck Evidence Preservation", group: "truck", parent: "truck", practiceArea: "truck-accidents", title: "Truck Accident Evidence Preservation", description: "Learn how truck logs, vehicle data, video, and inspection records may support a California accident claim and why timely preservation matters. Contact MMG." }),

  // Motorcycle accident guides
  P({ key: "lanesplit", path: "/california-lane-splitting-accident-lawyer", label: "Lane-Splitting Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Lane-Splitting Accident Lawyer", description: "Injured while lane splitting in California? Understand the rules, disputed fault, and evidence that may support your claim. Free MMG case evaluation." }),
  P({ key: "leftturn", path: "/left-turn-motorcycle-accident-lawyer", label: "Left-Turn Motorcycle Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Left-Turn Motorcycle Accident Lawyer", description: "Injured when a driver turned across your motorcycle's path? Learn about California right of way, visibility, and evidence. Free MMG case evaluation." }),
  P({ key: "lanechange", path: "/motorcycle-lane-change-accident-lawyer", label: "Lane-Change and Blind-Spot Accidents", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "Motorcycle Lane-Change Accident Lawyer in California", description: "Injured in a motorcycle sideswipe or blind-spot crash? Learn about California lane-change rules, evidence, and your options. Free MMG case evaluation." }),
  P({ key: "passenger", path: "/motorcycle-passenger-injury-claims", label: "Motorcycle Passenger Claims", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "California Motorcycle Passenger Injury Claims", description: "Injured as a motorcycle passenger in California? Explore potential claims, responsible parties, insurance questions, and your options with MMG Law Firm." }),
  P({ key: "motoprop", path: "/motorcycle-property-damage-claims", label: "Motorcycle Damage and Gear Claims", group: "moto", parent: "moto", practiceArea: "motorcycle-accidents", title: "Motorcycle Property Damage & Gear Claims in California", description: "Learn how to document motorcycle damage, riding gear losses, towing, and storage costs in California. Review property claim options with MMG Law Firm." }),

  // Serious injuries (existing URLs + new guides)
  P({ key: "catastrophic", path: "/practice-areas/catastrophic-injury", label: "Catastrophic Injuries", group: "injury", parent: "home", practiceArea: "catastrophic-injury", title: "California Catastrophic Injury Lawyer", description: "Learn how life-changing injuries affect future care, work, and accident claims. Discuss evidence, fees, and next steps with MMG in a free consultation." }),
  P({ key: "tbi", path: "/traumatic-brain-injury-after-accident", label: "Traumatic Brain Injury", group: "injury", parent: "catastrophic", practiceArea: "catastrophic-injury", title: "Traumatic Brain Injury After an Accident", description: "Understand brain injuries after a California accident, lasting effects, evidence, and legal next steps. Contact MMG Law Firm for a free case evaluation." }),
  P({ key: "sci", path: "/spinal-cord-injury-paralysis-lawyer", label: "Spinal Cord Injury", group: "injury", parent: "catastrophic", practiceArea: "catastrophic-injury", title: "California Spinal Cord Injury Lawyer", description: "Explore spinal cord injury and paralysis claims in California, including future care, lost income, and evidence. Contact MMG for a free case evaluation." }),
  P({ key: "wrongful", path: "/practice-areas/wrongful-death", label: "Wrongful Death", group: "injury", parent: "home", practiceArea: "wrongful-death", title: "California Vehicle Accident Wrongful Death Lawyer", description: "Learn about California wrongful death claims after a vehicle accident, family eligibility, potential losses, and deadlines. Speak with MMG for free." }),

  // Case results
  P({ key: "results", path: "/case-results", label: "Case Results", group: "results", parent: "home", title: "Case Results: Verdicts and Settlements", description: "Understand the facts behind a case outcome, how to read settlements and verdicts, and what to ask about your own California accident claim." }),
  P({ key: "carresults", path: "/car-accident-case-results", label: "Car Accident Results", group: "results", parent: "results", practiceArea: "car-accidents", title: "California Car Accident Case Results", description: "Understand car accident settlements and verdicts, what affects outcomes, and how to evaluate case examples. Contact MMG for a free case evaluation." }),
  P({ key: "truckresults", path: "/truck-accident-case-results", label: "Truck Accident Results", group: "results", parent: "results", practiceArea: "truck-accidents", title: "California Truck Accident Case Results", description: "Learn how to evaluate truck accident results, commercial-party roles, serious injuries, and supporting evidence. Ask MMG for a free case evaluation." }),
  P({ key: "motoresults", path: "/motorcycle-accident-case-results", label: "Motorcycle Accident Results", group: "results", parent: "results", practiceArea: "motorcycle-accidents", title: "California Motorcycle Accident Case Results", description: "Explore motorcycle accident results, rider-specific fault disputes, injury evidence, and settlement context. Ask MMG for a free case evaluation." }),

  // The firm
  P({ key: "attorney", path: "/attorneys/mihran-ghazaryan", label: "Our Attorney", group: "firm", parent: "home", title: "Mihran M. Ghazaryan — California Personal Injury Attorney", description: "Meet Mihran M. Ghazaryan, the Glendale-based California personal injury attorney who will guide your car, truck or motorcycle accident claim. English, Armenian, Russian." }),
  P({ key: "about", path: "/about-the-firm", label: "About the Firm", group: "firm", parent: "home", title: "About MMG Law Firm", description: "Meet MMG Law Firm, a Glendale practice serving injured Californians. Learn about direct attorney involvement, our approach, case costs, and a free consultation." }),
  P({ key: "reviews", path: "/reviews", label: "Reviews", group: "firm", parent: "home", title: "Client Reviews and Testimonials", description: "Read selected MMG Law Firm review excerpts, explore communication and client-service questions, and request a free California accident case evaluation." }),
  P({ key: "fees", path: "/fees-and-costs", label: "Fees & Costs", group: "firm", parent: "home", title: "Attorney Fees & Case Costs", description: "Understand MMG's accident case fees and costs. No recovery, no attorney fees or case expenses. Get a free California case evaluation." }),
  P({ key: "glendale", path: "/locations/los-angeles-county/glendale", label: "Glendale Office", group: "firm", parent: "home", title: "Glendale Personal Injury Lawyer", description: "MMG Law Firm's Glendale office represents people injured in car, truck and motorcycle accidents across Los Angeles County. Directions, parking, free consultation." }),
  P({ key: "consult", path: "/contact", label: "Contact", group: "firm", parent: "home", title: "Contact — Free Consultation", description: "Request a free, confidential case evaluation from MMG Law Firm in Glendale. Call or send a short description of what happened. English, Armenian, Russian." }),

  // Resources
  P({ key: "resources", path: "/resources", label: "Accident Resources", group: "resource", parent: "home", title: "California Accident Resources", description: "Official California accident resources, a comparative-fault illustration, and guides to deadlines, claims, compensation and settlements from MMG Law Firm." }),
  P({ key: "faqs", path: "/accident-lawyer-faqs", label: "Accident FAQs", group: "resource", parent: "resources", title: "California Accident Lawyer FAQs", description: "Get answers about California accident claims, lawyer fees, insurance, deadlines, and what to expect when you contact MMG Law Firm for a free case evaluation." }),
  P({ key: "after", path: "/what-to-do-after-california-accident", label: "After an Accident", group: "resource", parent: "resources", title: "What to Do After a California Accident", description: "Learn what to do after a California car, truck, or motorcycle accident: safety, medical care, evidence, reporting deadlines, and insurance. Free consultation." }),
  P({ key: "deadlines", path: "/california-accident-claim-deadlines", label: "Claim Deadlines", group: "resource", parent: "resources", title: "California Accident Claim Deadlines", description: "Understand California accident filing deadlines, six-month government claims, rejection notices, and exceptions. Ask MMG Law Firm about your next step." }),
  P({ key: "process", path: "/how-an-accident-claim-works", label: "How a Claim Works", group: "resource", parent: "resources", title: "How a California Accident Claim Works", description: "Learn how a California accident claim moves from consultation and investigation to negotiation, litigation, and resolution. Explore the steps with MMG." }),
  P({ key: "comp", path: "/compensation-after-a-california-accident", label: "Compensation", group: "resource", parent: "resources", title: "California Accident Compensation", description: "Learn about medical expenses, lost income, future losses, pain and suffering, and other California accident damages. Ask MMG for a free case evaluation." }),
  P({ key: "settle", path: "/insurance-settlement-offers-releases", label: "Settlement Offers and Releases", group: "resource", parent: "resources", title: "California Settlement Offers & Releases", description: "Before accepting a California accident settlement, understand release terms, medical liens, future losses, and your net recovery. Free MMG case evaluation." }),
  P({ key: "fault", path: "/partial-fault-california-accident", label: "Partial Fault", group: "resource", parent: "resources", title: "Partial Fault in a California Accident", description: "Partly at fault for a California accident? Learn how comparative negligence affects compensation, what evidence matters, and when to contact MMG Law Firm." }),
  P({ key: "bills", path: "/medical-bills-liens-treatment-costs", label: "Medical Bills and Liens", group: "resource", parent: "resources", title: "Medical Bills & Liens After an Accident", description: "Understand medical bills, liens, and treatment costs after a California accident. Learn how repayment claims affect your settlement. Free MMG case evaluation." }),

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
