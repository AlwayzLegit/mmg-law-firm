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

// Shared process for employment matters (used by the employment sub-practices).
const EMPLOYMENT_PROCESS: ProcessStep[] = [
  {
    title: "Free, confidential consultation",
    body: "We listen first and tell you plainly whether you appear to have a claim. The conversation is confidential and there's no fee to have it — and we're careful if you're still employed.",
  },
  {
    title: "Preserve the record",
    body: "Offer letters, handbooks, performance reviews, emails and texts, pay stubs, and a dated timeline. The contemporaneous record is what wins an employment case, so we lock it down early.",
  },
  {
    title: "Administrative exhaustion and the demand",
    body: "FEHA claims generally require a complaint with the Civil Rights Department and a right-to-sue notice first. We handle that step, then present a documented demand to the employer.",
  },
  {
    title: "Litigation when necessary",
    body: "Many matters resolve through negotiation or mediation. When an employer won't be reasonable, we file and prepare the case fully — which is usually what moves the number.",
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
  // TODO(human): attorney review required — AI-drafted CA employment copy.
  "wrongful-termination": {
    body: "California is an at-will state — but at-will never meant an employer can fire you for an unlawful reason. A termination is wrongful when it's because of a protected characteristic, in retaliation for protected activity (reporting harassment, a safety hazard, or wage theft; taking protected leave), or in violation of a clear public policy. These cases turn on timing and the paper trail: what your reviews said before, what changed, and what was said around the decision. We help you preserve that record and hold the employer to account.",
    subtopics: [
      {
        title: "Retaliation",
        body: "Fired after reporting harassment, discrimination, unsafe conditions, or wage violations — or after taking protected leave. The timing itself is often powerful evidence.",
      },
      {
        title: "Discrimination-based firing",
        body: "Terminations driven by race, sex, age, disability, pregnancy, religion, or national origin, often dressed up as a layoff or a sudden performance problem.",
      },
      {
        title: "Public-policy and whistleblower terminations",
        body: "Being fired for refusing to break the law, for jury duty, or for reporting illegal conduct (Labor Code §1102.5).",
      },
    ],
    process: EMPLOYMENT_PROCESS,
    whatToDo: [
      "Write a dated timeline of what happened while it's fresh.",
      "Save offer letters, reviews, emails, texts, and pay records to a personal (non-work) account.",
      "Don't sign a severance or release before it's reviewed — the deadline is usually negotiable.",
      "Note who made the decision and what reason they gave, in writing if possible.",
      "Talk to a lawyer before resigning — quitting can change the claim.",
    ],
    faqs: [
      {
        question: "Can I be fired for no reason in California?",
        answer:
          "Yes — at-will employment means an employer can end the relationship for any reason or no reason. What they cannot do is fire you for an illegal reason: because of a protected characteristic, in retaliation for protected activity, or in violation of public policy. If any of those is in play, 'at-will' is not a defense.",
      },
      {
        question: "How long do I have to bring a wrongful-termination claim?",
        answer:
          "It depends on the theory. FEHA claims generally require a complaint with the Civil Rights Department (commonly within three years) followed by one year to sue after the right-to-sue notice; a wrongful-termination-in-violation-of-public-policy claim generally runs two years. The deadlines differ, so don't wait to ask.",
      },
      {
        question: "What can I recover?",
        answer:
          "Depending on the case: lost wages and benefits (back pay), future lost earnings (front pay), emotional-distress damages, and in some cases punitive damages and attorney's fees. No honest lawyer can promise a number — it depends on the facts and the evidence.",
      },
    ],
  },
  // TODO(human): attorney review required — AI-drafted CA employment copy.
  "workplace-discrimination": {
    body: "California's Fair Employment and Housing Act (FEHA) is broader than federal law: it protects employees from discrimination based on race, color, national origin, sex, gender identity, pregnancy, age (40+), disability, medical condition, religion, sexual orientation, and more — and it applies to employers with as few as five employees. Discrimination can be an obvious adverse action (firing, demotion, pay cut) or a pattern of being passed over, written up, or excluded. We document the comparators and the timeline that show the real reason.",
    subtopics: [
      {
        title: "Adverse-action discrimination",
        body: "Termination, demotion, denied promotion, or pay disparity tied to a protected characteristic rather than performance.",
      },
      {
        title: "Pregnancy and disability discrimination",
        body: "Failure to accommodate, or punishment for needing leave or a reasonable accommodation under FEHA and the PDLL.",
      },
      {
        title: "Failure to accommodate / interactive process",
        body: "California requires employers to engage in a good-faith interactive process and provide reasonable accommodation for disability, pregnancy, and religion.",
      },
    ],
    process: EMPLOYMENT_PROCESS,
    whatToDo: [
      "Keep a dated log of incidents — what happened, who was present, what was said.",
      "Save performance reviews and any written comparisons to other employees.",
      "Put accommodation requests in writing and keep copies.",
      "Report through your employer's stated process where it's safe to do so.",
      "Preserve the record to a personal account and talk to a lawyer about the CRD complaint.",
    ],
    faqs: [
      {
        question: "Do I have to file with a government agency first?",
        answer:
          "For most FEHA discrimination claims, yes — you generally must file a complaint with California's Civil Rights Department and obtain a right-to-sue notice before suing. We handle that administrative step for you. The deadlines matter, so it's best to act early.",
      },
      {
        question: "How do I prove discrimination if no one admitted it?",
        answer:
          "Most cases are built on circumstantial evidence — timing, shifting explanations, how similarly-situated employees were treated, statistics, and the paper trail. Direct admissions are rare; a documented pattern is what carries these cases.",
      },
      {
        question: "Does FEHA cover small employers?",
        answer:
          "Yes — FEHA applies to employers with five or more employees (and harassment claims apply to employers of any size), which is broader than federal Title VII's 15-employee threshold.",
      },
    ],
  },
  // TODO(human): attorney review required — AI-drafted CA employment copy.
  "sexual-harassment": {
    body: "California law guarantees a workplace free of sexual harassment, and it holds employers responsible when they fail to prevent or stop it. Harassment takes two forms: quid pro quo (a manager conditioning a job benefit on sexual conduct) and a hostile work environment (severe or pervasive conduct that alters the conditions of your job). It can come from supervisors, coworkers, or even non-employees like clients. We handle these matters with discretion and build the record — the reports, the witnesses, the timeline — that an employer can't explain away.",
    subtopics: [
      {
        title: "Quid pro quo harassment",
        body: "A supervisor tying a raise, promotion, schedule, or continued employment to sexual demands.",
      },
      {
        title: "Hostile work environment",
        body: "Severe or pervasive unwelcome conduct — comments, advances, messages, touching — that a reasonable person would find abusive.",
      },
      {
        title: "Retaliation for reporting",
        body: "Punishment after you complained about harassment is itself unlawful, and the timing is often strong evidence.",
      },
    ],
    process: EMPLOYMENT_PROCESS,
    whatToDo: [
      "Save harassing messages, emails, and texts — and screenshot anything that might be deleted.",
      "Keep a dated log of incidents and who witnessed them.",
      "Report through your employer's process where safe; their response (or lack of one) matters.",
      "Preserve everything to a personal account.",
      "Talk to a lawyer about your options before signing anything or resigning.",
    ],
    faqs: [
      {
        question: "Does my employer have to have a certain number of employees?",
        answer:
          "No. Under California's FEHA, the prohibition on sexual harassment applies to employers of any size — even those with a single employee — which is broader than the federal threshold.",
      },
      {
        question: "What if I didn't report it right away?",
        answer:
          "A delay doesn't end your claim. Many people don't report immediately out of fear of retaliation, and the law accounts for that. The contemporaneous evidence — messages, a journal, witnesses — still matters; preserve it and talk to a lawyer.",
      },
      {
        question: "Can I be fired for complaining about harassment?",
        answer:
          "No. Retaliating against an employee for reporting harassment is independently unlawful. If you were disciplined or terminated after you complained, that timing can strengthen both the harassment and the retaliation claim.",
      },
    ],
  },
  // TODO(human): attorney review required — AI-drafted CA wage & hour copy.
  "wage-and-hour": {
    body: "California's wage-and-hour protections are among the strongest in the country, and violations are common — unpaid overtime, off-the-clock work, missed or interrupted meal and rest breaks, misclassification as 'exempt' or as an independent contractor, and final paychecks withheld after separation. These claims carry penalties on top of the wages owed, and the recovery often reaches back years. We reconstruct the hours from pay stubs, schedules, and records to show what you were actually owed.",
    subtopics: [
      {
        title: "Unpaid overtime & off-the-clock work",
        body: "California overtime starts after 8 hours in a day (not just 40 in a week), plus double-time rules. Work performed before clocking in or after clocking out is compensable.",
      },
      {
        title: "Meal & rest break violations",
        body: "Employees are generally owed a 30-minute meal period and paid rest breaks; missed or interrupted breaks trigger premium pay.",
      },
      {
        title: "Misclassification & final pay",
        body: "Being labeled 'exempt' or an independent contractor to avoid overtime, and waiting-time penalties when final wages aren't paid on time.",
      },
    ],
    process: EMPLOYMENT_PROCESS,
    whatToDo: [
      "Keep your pay stubs, schedules, and any record of hours actually worked.",
      "Note when you missed or were interrupted during meal and rest breaks.",
      "Save communications about your classification, duties, and pay.",
      "Don't rely on memory alone — contemporaneous records drive these claims.",
      "Talk to a lawyer about whether to file with the Labor Commissioner or in court.",
    ],
    faqs: [
      {
        question: "How far back can I recover unpaid wages?",
        answer:
          "Generally three years for Labor Code wage claims, and up to four years when paired with California's Unfair Competition Law. Waiting-time and other penalties can add to the recovery. Because the clock is running, it's best not to wait.",
      },
      {
        question: "My employer calls me 'salaried' — am I still owed overtime?",
        answer:
          "Maybe. A salary alone doesn't make you exempt; the law looks at your actual duties and whether you meet a specific exemption. Misclassification is one of the most common wage violations, and a 'salaried' title doesn't settle it.",
      },
      {
        question: "What does it cost to bring a wage claim?",
        answer:
          "We typically handle these on a contingency basis — no upfront cost — and many California wage statutes shift the employee's reasonable attorney's fees onto an employer that broke the law. The consultation is free.",
      },
    ],
  },
};

// TODO(human): attorney review required — AI-drafted "how the attorney helps"
// copy. It describes service and approach only — no outcome promises, no
// invented results — but should be confirmed before long-term use.
//
// Each entry is a short paragraph (Markdown) describing how attorney
// Mihran M. Ghazaryan personally handles this kind of matter. Rendered on the
// practice-area hub and on every city × practice page under a
// "How our attorney helps with …" heading.
const ATTORNEY_HELP: Record<string, string> = {
  "car-accidents":
    "When you hire MMG Law Firm, attorney Mihran M. Ghazaryan handles your case personally — not a case manager you never meet. He reviews the police report and your medical records himself, takes over every call with the adjuster, and looks for coverage others miss, including your own uninsured/underinsured-motorist policy. He also manages the medical liens that can quietly eat into a recovery, so more of any settlement stays with you.",
  "truck-accidents":
    "Truck cases are won or lost in the first days, so Mihran M. Ghazaryan moves immediately to preserve the evidence — the electronic logging device, the driver's hours-of-service records, and the truck's onboard data — before it can be overwritten. He identifies every responsible party (driver, carrier, broker, and their separate insurers) and applies the federal motor-carrier rules that govern these cases, building the claim for the larger exposure a commercial policy carries.",
  "motorcycle-accidents":
    "Riders walk in facing a built-in bias, and Mihran M. Ghazaryan's job is to dismantle it. He documents the mechanics of the crash — often with reconstruction — to show what actually happened, presents your injuries in full, and pushes back hard when an insurer tries to blame the rider. You deal directly with the attorney building that narrative, not a rotating intake team.",
  "pedestrian-accidents":
    "Pedestrian injuries are usually severe, and the right-of-way analysis is everything. Mihran M. Ghazaryan investigates the crosswalk, signal timing, and roadway conditions, and where a city vehicle or dangerous public road is involved he protects the short six-month government-claim deadline that can otherwise end a case before it starts. He coordinates your care and documents the full extent of your losses.",
  "bicycle-accidents":
    "Mihran M. Ghazaryan documents the bike-specific facts insurers prefer to ignore — door-zone collisions, unsafe passing, and right-hook turns — and counters the reflexive assumption that the cyclist was at fault. He gathers the scene evidence, witness accounts, and medical record that put the claim on solid ground, and handles the insurer directly so you can heal.",
  "slip-and-fall":
    "Premises cases turn on notice — whether the owner knew or should have known about the hazard — so Mihran M. Ghazaryan builds the timeline early, before surveillance video is recorded over and conditions are fixed. He secures incident reports, photographs, and maintenance records, identifies the right defendant, and presents a documented demand rather than letting the insurer set the terms.",
  "wrongful-death":
    "These are the matters Mihran M. Ghazaryan approaches with the most care. He identifies the family members California law allows to bring a claim, handles the process so the family doesn't have to relive it at every turn, and accounts fully for both the economic and the human losses — quietly, respectfully, and with the family's wishes leading the way.",
  "dog-bites":
    "California holds dog owners strictly liable, and Mihran M. Ghazaryan works directly with the owner's homeowners or renters insurer so families aren't put in the position of suing a neighbor out of pocket. He documents the bite, the medical treatment, and any scarring with the seriousness these injuries — especially to children — deserve.",
  "rideshare-accidents":
    "Uber and Lyft cases come down to which policy applies at the exact moment of the crash, and Mihran M. Ghazaryan maps that timeline precisely. He pulls the trip data, pinpoints the driver's app status, and pursues the up-to-$1M coverage that applies during an active ride — coverage adjusters won't volunteer. You work with the attorney untangling those layered policies, start to finish.",
  "catastrophic-injury":
    "A catastrophic injury is measured over a lifetime, and Mihran M. Ghazaryan builds it that way. He assembles the life-care plan and the medical and economic experts who can prove the true future cost, refuses the quick lowball offer insurers use to close out large exposure early, and prepares the case for the long horizon it requires — so the recovery reflects the care you'll actually need.",
  "employment-law":
    "Mihran M. Ghazaryan starts with a confidential review of what happened and tells you plainly whether you have a claim. He helps you preserve the record that wins employment cases — the emails, reviews, and timeline — handles the Civil Rights Department complaint and right-to-sue process, and holds the employer to California's strong protections for employees. Where it fits, his fee comes only from a recovery.",
  "wrongful-termination":
    "Mihran M. Ghazaryan looks past the reason the employer wrote down to the one that actually drove the firing. He reconstructs the timeline — your reviews before, what changed, who decided, and what was said — preserves the paper trail, and handles the Civil Rights Department step where it applies. He tells you honestly whether 'at-will' is a real defense in your case or a cover, and pursues the back pay, front pay, and emotional-distress damages the law allows.",
  "workplace-discrimination":
    "Discrimination is rarely admitted, so Mihran M. Ghazaryan builds it from the evidence around it — how comparable employees were treated, shifting explanations, the accommodation requests that went unanswered, and the timing. He handles the FEHA complaint and right-to-sue process, and presses the employer on the interactive-process and reasonable-accommodation duties California imposes. You work directly with the attorney assembling that record.",
  "sexual-harassment":
    "Mihran M. Ghazaryan handles these matters with discretion and care. He preserves the messages, reports, and witness accounts before they disappear, evaluates both the harassment and any retaliation that followed, and holds the employer to its duty to prevent and stop it. He explains your options plainly — including what reporting and not-yet-reporting mean for your claim — and pursues the full range of relief the law provides.",
  "wage-and-hour":
    "Mihran M. Ghazaryan reconstructs what you were actually owed from pay stubs, schedules, and the hours you really worked — the overtime, off-the-clock time, and missed breaks an employer hoped you wouldn't track. He tests a 'salaried' or 'contractor' label against your real duties, and pursues the penalties California stacks on top of unpaid wages. These cases are typically contingency, with fees often shifted onto the employer that broke the law.",
};

/** "How our attorney helps" paragraph for a practice area, with a safe generic
 *  fallback so a brand-new practice slug still renders the section. */
export function getAttorneyHelp(slug: string, nounSingular: string): string {
  return (
    ATTORNEY_HELP[slug] ??
    `When you hire MMG Law Firm, attorney Mihran M. Ghazaryan handles your ${nounSingular} matter personally — reviewing the facts himself, dealing with the insurer or opposing party directly, and keeping you informed at every step. Because he keeps his caseload deliberate, your questions are answered by the lawyer actually handling your case.`
  );
}
