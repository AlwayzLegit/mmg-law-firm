/**
 * English UI dictionary — the baseline + fallback for every other locale.
 *
 * Scope: the localized landing and contact pages (`/hy`, `/ru`), the shared
 * chrome around them and the lead form. Long-form page content (practice
 * guides, blog posts, legal pages) is NOT translated — the English pages are
 * the official version and localized pages link to them.
 *
 * Placeholders: `{phone}` and `{name}` are filled by `fmt()` in
 * `src/lib/i18n/index.ts`. Links in `landing.practices` point at English
 * pages; `common.inEnglish` labels them.
 *
 * The shape of this object IS the `Dictionary` type; routed locales must
 * override every key (enforced by dictionaries.test.ts).
 */
export const en = {
  meta: {
    /** <html lang>-independent name shown in switchers. */
    languageName: "English",
    homeTitle: "Glendale Accident Lawyer — Free Consultation",
    homeDescription:
      "Mihran M. Ghazaryan represents people injured in car, truck and motorcycle accidents across California. Free consultation. No recovery, no attorney fees or case expenses.",
    contactTitle: "Free Consultation — Contact MMG Law Firm",
    contactDescription:
      "Tell us what happened. We call back during office hours in your language. Free consultation with Glendale accident attorney Mihran M. Ghazaryan.",
  },
  nav: {
    home: "Home",
    practiceAreas: "Practice Areas",
    locations: "Locations",
    about: "About",
    blog: "Blog",
    reviews: "Reviews",
    caseResults: "Case Results",
    contact: "Contact",
    englishSite: "English",
    menu: "Menu",
  },
  cta: {
    freeConsultation: "Free Consultation",
    requestConsultation: "Request a free consultation",
    callNow: "Call now",
    call: "Call {phone}",
    noFeeUnlessWeWin: "No recovery, no attorney fees or case expenses.",
  },
  common: {
    menu: "Menu",
    close: "Close",
    language: "Language",
    skipToContent: "Skip to main content",
    inEnglish: "in English",
    quickContact: "Quick contact",
  },
  landing: {
    eyebrow: "Glendale, California · Personal injury",
    h1: "Injured in an accident? Talk to a lawyer who speaks your language.",
    lead:
      "Mihran M. Ghazaryan represents people hurt in car, truck and motorcycle accidents across California. Free consultation, in English, Armenian or Russian.",
    feeNote: "You pay nothing up front.",
    practicesTitle: "What we handle",
    practices: {
      car: {
        title: "Car accidents",
        body: "Fault, insurance disputes and compensation for your injuries.",
      },
      truck: {
        title: "Truck accidents",
        body: "Commercial vehicle collisions, trucking-company liability and evidence.",
      },
      moto: {
        title: "Motorcycle accidents",
        body: "Rider claims, shared fault and injury compensation.",
      },
      other: {
        title: "Other injury cases",
        body: "Pedestrian and bicycle accidents, slip and fall, dog bites, wrongful death.",
      },
    },
    whyTitle: "How we work",
    why: {
      direct: {
        title: "Direct access to the attorney",
        body: "Your case is handled by the attorney, not a call center. You speak with him directly.",
      },
      language: {
        title: "Clear answers in your language",
        body: "The attorney speaks English, Armenian and Russian. No interpreter needed.",
      },
      insurer: {
        title: "We deal with the insurance company",
        body: "We handle the calls, paperwork and negotiation so you can focus on recovering.",
      },
    },
    attorneyTitle: "About the attorney",
    attorneyBody:
      "Mihran M. Ghazaryan, California State Bar No. {bar}. The office is in Glendale and serves clients throughout California.",
    attorneyLink: "Attorney profile",
    areasTitle: "Where we serve",
    areasBody: "Glendale, Los Angeles County and clients across California.",
    contactTitle: "Free consultation",
    contactBody:
      "Tell us what happened. We call you back during office hours, in your language.",
    noticeTitle: "Please note.",
    noticeBody:
      "This page is a translation provided for convenience. The English pages, including the legal notices below, are the official version.",
  },
  contact: {
    title: "Contact us for a free consultation",
    lead: "Tell us what happened. We call you back during office hours, in your language.",
    officeTitle: "Office",
    hoursLabel: "Hours",
    hours: "Monday–Friday, 9 am–6 pm Pacific",
    phoneLabel: "Phone",
    emailLabel: "Email",
    whatToExpectTitle: "What happens next",
    whatToExpect: {
      call: "The attorney or his staff calls you back, usually the same business day.",
      free: "The consultation is free and there is no obligation.",
      privacy: "Everything you share is confidential. Do not send medical records through this form.",
    },
  },
  leadForm: {
    headline: "Request a free consultation",
    fullName: "Full name *",
    phone: "Phone *",
    email: "Email (optional)",
    accidentType: "Accident type (optional)",
    accidentTypes: {
      car: "Car accident",
      truck: "Truck accident",
      motorcycle: "Motorcycle accident",
      other: "Other",
    },
    whatHappened: "What happened? A brief description is enough.",
    submit: "Request my free consultation",
    sending: "Sending…",
    successTitle: "Thank you, {name}.",
    successBody:
      "Your request has been received. We follow up during office hours. For immediate help, call",
    honeypot: "Company (leave blank)",
    errors: {
      rateLimited: "You've sent several requests recently. Please call {phone}.",
      checkFields: "Please check the highlighted fields.",
      turnstile: "Bot protection failed to load. Please call {phone}.",
      generic: "We couldn't submit your request. Please try again or call {phone}.",
      timeout: "This is taking longer than expected. Please call {phone}.",
      network: "Network error. Please try again or call {phone}.",
    },
    /**
     * TCPA consent shown next to the checkbox. The server stores the text in
     * the language the visitor saw (leads.consent_text).
     */
    consent:
      "By checking this box, I agree to receive calls and text messages from MMG Law Firm at the number provided, including by autodialer. Consent is not a condition of service. Message and data rates may apply. Reply STOP to opt out.",
  },
  footer: {
    attorneyAdvertising: "Attorney Advertising.",
    noticesIntro:
      "The legal notices below are provided in English, as required by the California Rules of Professional Conduct.",
    languagesLabel: "Languages",
    hoursLabel: "Hours",
    cta: "Free consultation",
    linksTitle: "Pages",
    legalTitle: "Legal",
    privacy: "Privacy policy",
    disclosures: "Disclosures",
    accessibility: "Accessibility",
    rights: "All rights reserved.",
  },
} as const;

/** Literal strings widened so other locales type-check against the shape. */
type Widen<T> = T extends string ? string : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;
