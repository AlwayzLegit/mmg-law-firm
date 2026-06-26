/**
 * Per-practice-area editorial content — the in-code fallback rendered when
 * the matching `practice_areas` row isn't published. Once the attorney edits
 * a row at /admin/content/practice-areas/[id] and publishes it, the DB
 * content takes precedence; this module remains the dev-without-Supabase
 * fallback and the attorney's starting reference inside the editor.
 *
 * The copy below is a conservative process-and-scope starting point — not
 * legal advice — and avoids result/outcome claims.
 */

import type { FaqItem } from "@/lib/data/faqs";

export type Subtopic = { title: string; body: string };
export type ProcessStep = { title: string; body: string };

export type PracticeAreaContent = {
  /** Lead paragraph(s) to display below the hero on the practice-area page. */
  body: string;
  /** Common sub-categories of cases inside this practice area. */
  subtopics: Subtopic[];
  /** What we do, in order, after an injured client engages us. */
  process: ProcessStep[];
  /** Things to do (or avoid) immediately after this kind of injury. */
  whatToDo: string[];
  /** FAQs displayed on the practice-area page. */
  faqs: FaqItem[];
};

const COMMON_PROCESS: ProcessStep[] = [
  {
    title: "Free, no-pressure consultation",
    body: "We listen first. We answer your questions. There is no fee for the initial conversation — and you decide whether to engage us at the end of it.",
  },
  {
    title: "Investigation and evidence preservation",
    body: "Police reports, scene photos, witness statements, vehicle data, surveillance video, medical records. The earlier we collect, the harder it is for the other side to reshape the story later.",
  },
  {
    title: "Treatment, demand, and negotiation",
    body: "We coordinate with your providers, document the full extent of damages — medical, lost income, pain — and present a demand backed by evidence. We push back firmly when an insurer lowballs.",
  },
  {
    title: "Litigation when necessary",
    body: "Most matters settle. When an insurer refuses to be reasonable, we file. Preparing every case as if it will be tried is what makes the settlement number move.",
  },
];

export const PRACTICE_AREA_CONTENT: Record<string, PracticeAreaContent> = {
  "car-accidents": {
    body: "California car-accident cases turn on small details — exact timing, signal phases, vehicle dynamics, and how the medical record reads in the first 72 hours. We act quickly to lock those facts down so the other side cannot reshape them later. Whether the collision happened on a Glendale surface street, the 405, or a Central Valley freeway, the playbook is the same: a careful liability investigation, a tight medical record, and a firm posture with the insurer.",
    subtopics: [
      {
        title: "Rear-end and stop-light collisions",
        body: "Often clearer on liability, but insurers still routinely dispute injury causation in low-speed impacts. We pair the medical record with biomechanical context to defeat that argument.",
      },
      {
        title: "Intersection and left-turn crashes",
        body: "Disputed-fault claims where the right-of-way analysis matters. Reconstruction, signal timing, and witness statements drive the result.",
      },
      {
        title: "Hit-and-run and uninsured-motorist",
        body: "We work directly with your own UM/UIM coverage when the at-fault driver flees or has no insurance, and we make sure your insurer treats you as the customer, not the adversary.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Get medical attention even if you feel okay — adrenaline masks injury for hours.",
      "Document the scene with photos before anyone moves the vehicles, if it is safe.",
      "Get the other driver's name, license, plate, and insurance info.",
      "Write down what witnesses saw and how to reach them.",
      "File a report with the responding agency (or, for minor crashes, with DMV via SR-1 within 10 days).",
      "Do not give a recorded statement to the other driver's insurance before talking to a lawyer.",
    ],
    faqs: [
      {
        question:
          "The other driver's insurer wants me to give a recorded statement. Should I?",
        answer:
          "Almost always, no — not before you have spoken with an attorney. These statements are scripted to elicit answers the insurer can use to reduce or deny your claim. We can speak to the insurer on your behalf.",
      },
      {
        question: "What if my own insurance is asking for a statement?",
        answer:
          "Your duty to cooperate with your own insurer is different. We help you provide what is required without overstepping into territory that could be used against you.",
      },
      {
        question: "I was in a rideshare as a passenger. What changes?",
        answer:
          "Rideshare matters layer Uber's or Lyft's $1M policy on top of the at-fault driver's policy when the app was active. We know how those phases interact.",
      },
    ],
  },
  "truck-accidents": {
    body: "Commercial truck cases are not big car cases. Federal motor-carrier safety rules, electronic logs, hours-of-service violations, and corporate spoliation tactics make them a different kind of fight. The insurance limits are higher and the defense is harder. Speed of investigation matters most: trucking companies dispatch their own investigators within hours.",
    subtopics: [
      {
        title: "Tractor-trailer and 18-wheeler crashes",
        body: "Often involve fatigue, improper loading, or maintenance failures. We send a preservation letter immediately and pursue ELD and ECM data.",
      },
      {
        title: "Delivery-truck and box-truck collisions",
        body: "Last-mile delivery has driven a surge in inexperienced drivers under tight schedules. Liability often runs to the carrier, not just the driver.",
      },
      {
        title: "Underride and override collisions",
        body: "Catastrophic injury cases. Vehicle conspicuity, guard equipment, and applicable FMCSA standards all matter.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Call 911 and request medical evaluation on scene.",
      "Photograph the truck — license plate, USDOT number, MC number, trailer markings.",
      "Get the trucking company's name, not just the driver's.",
      "Save any clothing or vehicle parts as evidence.",
      "Contact us before speaking with the trucking company's insurer or a 'rapid response' team.",
    ],
    faqs: [
      {
        question:
          "How soon do I need to act after a truck accident?",
        answer:
          "Quickly. Trucking companies routinely overwrite electronic logging device data after the regulatory retention period and dispatch investigators within hours. We preserve evidence the same day we are retained.",
      },
      {
        question: "Who is on the hook — the driver or the company?",
        answer:
          "Often both. Federal regulations and California vicarious-liability rules typically reach the carrier directly when the driver was on the job, plus the carrier's insurance and sometimes the broker or shipper depending on the facts.",
      },
    ],
  },
  "motorcycle-accidents": {
    body: "Riders carry an unfair burden in California courtrooms — implicit jury bias, insurer assumptions about lane-splitting, and reduced injury-cause sympathy. We prepare motorcycle cases to overcome that bias from the first move: clean reconstruction, clear narrative, and visible client preparation. The injuries are usually severe; the case work has to match.",
    subtopics: [
      {
        title: "Left-turn and right-of-way collisions",
        body: "The classic cause: a car turning across the rider's path. Witness statements and timing analysis are key.",
      },
      {
        title: "Lane-change and unsafe-merging crashes",
        body: "California lane-splitting is legal — but reasonable. We document compliance with CHP guidelines to defeat shared-fault claims.",
      },
      {
        title: "Road-defect and dooring claims",
        body: "Government-entity claims have a six-month presentation deadline. Dooring claims involve California Vehicle Code §22517.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Get medical care immediately — adrenaline and gear can hide serious injury.",
      "Photograph the bike, your gear, and the scene before anything moves.",
      "Preserve your gear — helmet, jacket, gloves — without cleaning it.",
      "Identify any witnesses; bystanders often vanish quickly after motorcycle crashes.",
      "Call us before talking to either insurer.",
    ],
    faqs: [
      {
        question: "Will my case be hurt because I was lane-splitting?",
        answer:
          "Lane-splitting is legal in California, but the question is whether you did it reasonably. CHP has published guidelines that we use to frame the conduct, and we frequently defeat shared-fault arguments insurers raise.",
      },
      {
        question: "What about the medical bills while my case is pending?",
        answer:
          "We work with your providers to ensure treatment continues, including through liens when appropriate. You should never delay medical care because you are worried about the bill.",
      },
    ],
  },
  "pedestrian-accidents": {
    body: "Pedestrian-strike injuries are usually severe. California gives pedestrians strong right-of-way protections, but insurers still attempt to shift fault — claiming the pedestrian darted out, was distracted, or was outside the crosswalk. We rebuild the moments before impact with witness work, traffic-camera footage, and crash reconstruction so the narrative does not depend on the driver's word alone.",
    subtopics: [
      {
        title: "Crosswalk strikes",
        body: "Marked or unmarked, California pedestrians retain right-of-way. We identify the sight-line failures and signal timing that tell the real story.",
      },
      {
        title: "Parking-lot and back-over collisions",
        body: "Often involve fleet vehicles, rideshare drivers, or delivery contractors. Surveillance footage matters and disappears fast.",
      },
      {
        title: "Hit-and-run pedestrian claims",
        body: "Your own UM/UIM policy may reach. Even when the driver is unidentified, recovery is often possible.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Accept emergency medical evaluation on scene, even if you can walk.",
      "Take photos of the location — crosswalk, signs, signals — and the vehicle's resting position.",
      "Get witness names; pedestrian witnesses are common but rarely contacted by police.",
      "Save the clothing you were wearing — it may be evidence.",
      "Call us before giving any statement.",
    ],
    faqs: [
      {
        question:
          "I was outside the crosswalk. Do I still have a case?",
        answer:
          "Often, yes. California pedestrians outside crosswalks still have a duty of care, but so do drivers — and the question is comparative. Pure comparative fault means partial recovery is still meaningful recovery.",
      },
    ],
  },
  "bicycle-accidents": {
    body: "Bike cases reward a careful look at infrastructure, sight lines, and what the bike rider actually had to work with at the moment of the crash. Insurers love to argue cyclists were going too fast or were not visible. We document bike-specific facts — light usage, gear, lane positioning — that defeat those arguments.",
    subtopics: [
      {
        title: "Door-zone collisions",
        body: "California Vehicle Code §22517 makes opening a door into traffic the responsibility of the door-opener. We frame these cleanly.",
      },
      {
        title: "Right-hook and unsafe-merge crashes",
        body: "Drivers turning across a bike lane without yielding. Lane-position and bike-lane markings are central.",
      },
      {
        title: "Hit-from-behind crashes",
        body: "Often the most serious injuries. Visibility analysis and reconstruction matter here as much as in any motor-vehicle case.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Get medical attention — concussion symptoms can take days to appear.",
      "Photograph the bike's resting position, the lane markings, and the vehicle.",
      "Save the bike, your helmet, and clothing without cleaning them.",
      "Identify witnesses; pedestrians and other riders often see what police miss.",
      "Call us before contacting either insurer.",
    ],
    faqs: [
      {
        question: "I was not wearing a helmet — does that hurt my case?",
        answer:
          "Adult helmet use is not legally required in California. Insurers may argue helmet non-use reduces head-injury damages, but this is not the same as the underlying liability question. We frame the issue carefully.",
      },
    ],
  },
  "slip-and-fall": {
    body: "Premises liability turns on notice — what the property owner knew, or should have known, before the hazard hurt you. The case is built in the first 48 hours: incident reports, surveillance footage, sweep logs, employee statements. By the time most clients reach us, half the evidence is already at risk of being lost. Acting quickly is the single best thing a slip-and-fall plaintiff can do.",
    subtopics: [
      {
        title: "Wet-floor and spill cases",
        body: "Sweep schedules, mop logs, and warning-sign placement decide these. We pull them via subpoena when necessary.",
      },
      {
        title: "Stair, handrail, and step defects",
        body: "Code-compliance review and expert measurement of riser and tread tolerances drive liability.",
      },
      {
        title: "Inadequate-security claims",
        body: "Where assault or robbery occurred on premises and the owner knew of risk. Police-call records and prior incidents matter here.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Report the fall to the property manager and ask for a written incident report.",
      "Get a copy of the incident report before leaving — they are routinely 'lost' later.",
      "Photograph the hazard, the area, and your shoes.",
      "Preserve your shoes and clothing as worn.",
      "Get witness contact information immediately.",
      "Call us before signing anything from the property's insurer.",
    ],
    faqs: [
      {
        question: "Don't I need to prove the owner caused the hazard?",
        answer:
          "Not exactly — premises liability requires showing the owner knew or should have known about the hazard and failed to address it. That is often a documentation question, and it is the single most important thing to investigate quickly.",
      },
    ],
  },
  "wrongful-death": {
    body: "These are the matters we approach with the most care. California Code of Civil Procedure §377.60 defines who can bring a wrongful-death claim — typically a spouse, child, or heir — and §377.30 provides a separate survival action for damages the deceased could have recovered. The two run in parallel. We handle the legal work so the family can focus on grief and recovery.",
    subtopics: [
      {
        title: "Motor-vehicle fatalities",
        body: "Includes pedestrian, bicycle, motorcycle, and passenger fatalities. Federal regulations and CHP investigation drive the timeline.",
      },
      {
        title: "Premises and workplace fatalities",
        body: "Cal-OSHA reports become available later than family expects. We coordinate the investigation around their pace, not the agency's.",
      },
      {
        title: "Medical-related deaths",
        body: "MICRA limits and physician/hospital coordination create unique procedural rules. We work with consulting experts early.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Take the time you need before making decisions about a case.",
      "Preserve any evidence in your possession — vehicles, clothing, devices.",
      "Do not sign anything from the at-fault party's insurer.",
      "Be cautious of social-media posts; they will be reviewed.",
      "When ready, call us. The consultation is free and there is no rush.",
    ],
    faqs: [
      {
        question: "Who can bring a wrongful-death claim in California?",
        answer:
          "Generally the surviving spouse or domestic partner, children, or — if none — heirs at law. There are exceptions for financially dependent parents, stepchildren, and others. We can review the family situation and explain who has standing.",
      },
      {
        question: "How long do we have to file?",
        answer:
          "The general statute of limitations is two years from the date of death, but several exceptions apply (claims against government entities have a six-month presentation deadline). Sooner is always better.",
      },
    ],
  },
  "dog-bites": {
    body: "California is a strict-liability state for dog bites: the owner is responsible for injuries even if the dog has never bitten before. Civil Code §3342 sets the rule. The real questions are usually about insurance — most claims resolve through the owner's homeowners or renters policy — and about scarring damages, which are typically the largest item.",
    subtopics: [
      {
        title: "Children's dog bites",
        body: "Scarring on a child has a long arc. We document the injury carefully and, when appropriate, hold the recovery in a court-supervised account.",
      },
      {
        title: "Postal carrier and delivery worker bites",
        body: "Workers' compensation and the homeowner's policy can both apply. We coordinate to maximize total recovery.",
      },
      {
        title: "Multi-dog incidents and provocation defenses",
        body: "Strict liability has narrow exceptions. We address provocation defenses head-on with witness work and documentation.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Get medical attention; rabies and infection risk drive immediate care.",
      "Report the bite to animal control and request a copy of the report.",
      "Photograph wounds at intake and during healing — scarring damages depend on documentation.",
      "Get the owner's homeowners or renters insurance information.",
      "Call us before signing anything.",
    ],
    faqs: [
      {
        question: "What if it was the dog's first bite?",
        answer:
          "Under California Civil Code §3342, strict liability applies regardless of prior incidents. The 'one-bite rule' does not apply here.",
      },
      {
        question: "Will the dog be put down?",
        answer:
          "That is an animal-control matter and is not affected by your civil claim. We do not control that decision.",
      },
    ],
  },
  "rideshare-accidents": {
    body: "Uber and Lyft cases are about which insurance applies at the moment of the crash. The platforms' coverage shifts based on driver app status: offline, available and waiting, en route to pickup, or carrying a passenger. We pull the trip data, identify the right policy phase, and pursue the up to $1M in coverage that applies during active rides.",
    subtopics: [
      {
        title: "Passenger injury during an active ride",
        body: "Uber's or Lyft's $1M policy is in force. The driver's personal policy is irrelevant to your recovery in most cases.",
      },
      {
        title: "Driver as plaintiff (rideshare driver injured)",
        body: "Uninsured/underinsured-motorist coverage from the platform applies during active periods. We make sure rideshare drivers know what they have.",
      },
      {
        title: "Pedestrians and other vehicles struck by rideshare drivers",
        body: "App-status windows determine which policy responds. Trip data is the central piece.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Get medical attention immediately.",
      "Screenshot your trip — both the receipt and the driver profile.",
      "Save the in-app trip details before the app updates them.",
      "Photograph the scene, the vehicle, and the rideshare placards.",
      "Do not give a recorded statement to either insurer before contacting us.",
    ],
    faqs: [
      {
        question:
          "I was the rideshare driver. Does Uber's coverage protect me?",
        answer:
          "Yes — partially, and only during covered phases. The platform provides UM/UIM coverage during active periods. We map the timeline carefully because the dollar exposure changes with each phase.",
      },
    ],
  },
  // TODO(human): attorney review required — AI-drafted catastrophic-injury copy.
  "catastrophic-injury": {
    body: "A catastrophic injury changes the rest of a person's life — and the value of the case is measured over that whole life, not just the first hospital bill. Traumatic brain injury, spinal-cord damage and paralysis, severe burns, amputations, and multiple fractures demand a different kind of preparation: life-care planning, vocational and economic experts, and treating physicians who can speak to a lifetime of future cost. Insurers fight these cases hardest because the exposure is largest, so we build the long-term medical and financial picture early and document it relentlessly.",
    subtopics: [
      {
        title: "Traumatic brain injury (TBI)",
        body: "From concussion with lasting cognitive effects to severe TBI. We pair imaging and neuropsychological testing with day-in-the-life evidence so the invisible effects are made concrete.",
      },
      {
        title: "Spinal-cord injury and paralysis",
        body: "Paraplegia and quadriplegia carry lifelong attendant-care and accessibility costs. A life-care plan quantifies them so the demand reflects the real future.",
      },
      {
        title: "Amputation, severe burns, and disfigurement",
        body: "Permanent loss and scarring support significant non-economic damages alongside future surgical and prosthetic costs.",
      },
      {
        title: "Multiple fractures and polytrauma",
        body: "Injuries needing several surgeries, hardware, and extended rehabilitation, where future-treatment proof drives the value.",
      },
    ],
    process: COMMON_PROCESS,
    whatToDo: [
      "Follow every treatment recommendation and keep all specialist appointments — gaps in care get used against you.",
      "Keep a journal of pain, limitations, and how daily life has changed.",
      "Preserve everything: medical records, bills, the device or vehicle involved, and the scene if possible.",
      "Designate one family member to track providers and expenses while you focus on recovery.",
      "Do not accept an early settlement before the full extent of future care is known.",
      "Do not give a recorded statement to the insurer before speaking with a lawyer.",
    ],
    faqs: [
      {
        question: "Why does a catastrophic-injury case take longer?",
        answer:
          "Because the value depends on your future — and that can't be measured until your treating doctors can describe what recovery and lifelong care look like. Settling before you reach maximum medical improvement risks leaving future costs uncovered. We move the case forward in parallel so the timeline is driven by your medicine, not by delay.",
      },
      {
        question: "What is a life-care plan and why does it matter?",
        answer:
          "A life-care plan is an expert-prepared roadmap of the future medical care, equipment, therapy, and assistance a catastrophic injury will require, with the projected cost of each. It turns 'lifelong harm' into a documented number an insurer and a jury can evaluate. It is often the single most important piece of evidence in these cases.",
      },
      {
        question: "The insurer offered a large check quickly. Should I take it?",
        answer:
          "A fast, large-sounding offer is often still far below the lifetime cost of a catastrophic injury — insurers know an early release ends their exposure. Before signing anything, have the offer measured against a life-care plan and an economic analysis. We do that at no cost in the consultation.",
      },
    ],
  },
  // TODO(human): attorney review required — AI-drafted California employment-law
  // copy (FEHA / Labor Code framing). Confirm before long-term use.
  "employment-law": {
    body: "California gives employees some of the strongest workplace protections in the country — and most workers never learn what they're owed until something goes wrong. We represent employees in wrongful termination, discrimination and harassment, retaliation and whistleblower claims, and unpaid wages and overtime. These cases turn on documentation and timing: what was said, what was written, who knew what, and which deadline applies. We help you preserve the record and hold the employer to the standard the law sets.",
    subtopics: [
      {
        title: "Wrongful termination",
        body: "Firings that violate the FEHA, retaliate for protected activity, or breach California public policy — including terminations dressed up as layoffs or performance issues.",
      },
      {
        title: "Discrimination and harassment",
        body: "Adverse treatment or a hostile environment based on a protected class — race, sex, age, disability, religion, national origin, pregnancy, and more — under the FEHA.",
      },
      {
        title: "Retaliation and whistleblower claims",
        body: "Punishment for reporting harassment, unsafe conditions, or unlawful conduct, or for taking protected leave. California law protects employees who speak up.",
      },
      {
        title: "Unpaid wages and overtime",
        body: "Off-the-clock work, missed meal and rest breaks, misclassification, and unpaid final wages — Labor Code claims that carry penalties on top of the wages owed.",
      },
    ],
    process: [
      {
        title: "Free, confidential consultation",
        body: "We listen first and tell you plainly whether you appear to have a claim. The conversation is confidential and there's no fee to have it — and we're careful if you're still employed.",
      },
      {
        title: "Preserve the record",
        body: "Offer letters, handbooks, performance reviews, emails and texts, pay stubs, and a timeline of events. The contemporaneous record is what wins or loses an employment case, so we lock it down early.",
      },
      {
        title: "Administrative exhaustion and the demand",
        body: "FEHA claims generally require a complaint with the Civil Rights Department and a right-to-sue notice first. We handle that step, then present a documented demand to the employer.",
      },
      {
        title: "Litigation when necessary",
        body: "Many matters resolve through negotiation or mediation. When an employer won't be reasonable, we file and prepare the case fully — which is usually what moves the number.",
      },
    ],
    whatToDo: [
      "Write down a dated timeline of what happened while it's fresh.",
      "Save copies of relevant documents to a personal (non-work) account — offer letter, reviews, emails, texts, pay records.",
      "Keep notes of who said what, when, and who else was present.",
      "Be careful about signing severance or release agreements before they're reviewed — deadlines to accept are usually negotiable.",
      "Report harassment or discrimination through your employer's stated process where it's safe to do so.",
      "Talk to a lawyer before resigning — quitting can change the claim and the remedies available.",
    ],
    faqs: [
      {
        question: "Do I have to file with a government agency before I can sue?",
        answer:
          "For most California FEHA claims (discrimination, harassment, retaliation), yes — you generally must file a complaint with the Civil Rights Department and obtain a right-to-sue notice first. We handle that administrative step for you. Some claims, such as certain wage claims, follow different paths. The deadlines matter, so don't wait to ask.",
      },
      {
        question: "Can I be fired for reporting harassment or a safety problem?",
        answer:
          "No. California law prohibits retaliation against employees for reporting harassment, discrimination, unsafe conditions, or other unlawful conduct, and for taking legally protected leave. If you were disciplined or terminated after speaking up, the timing itself can be powerful evidence. Preserve the record and call us.",
      },
      {
        question: "I signed a severance agreement. Is it too late?",
        answer:
          "Not necessarily — it depends on what you signed and when, and whether the release was valid. Have the agreement reviewed before assuming your rights are gone. If you've been presented with severance but haven't signed, talk to a lawyer first; the terms and the deadline to accept are more negotiable than they appear.",
      },
    ],
  },
};
