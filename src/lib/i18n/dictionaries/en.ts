/**
 * English UI dictionary — the baseline + fallback for every other locale.
 *
 * Scope: stable, shared microcopy (nav, CTAs, lead-form field labels,
 * footer). Long-form page content (practice-area bodies, blog posts, legal
 * pages) is NOT translated here — that lives in the database / MDX and is
 * the attorney's domain.
 *
 * The shape of this object IS the `Dictionary` type; other locales are
 * deep-partial overrides of it.
 */
export const en = {
  nav: {
    home: "Home",
    practiceAreas: "Practice Areas",
    locations: "Locations",
    about: "About",
    blog: "Blog",
    reviews: "Reviews",
    caseResults: "Case Results",
    contact: "Contact",
  },
  cta: {
    freeConsultation: "Free Consultation",
    requestConsultation: "Request a free consultation",
    callNow: "Call now",
    noFeeUnlessWeWin: "No fee unless we win",
  },
  common: {
    menu: "Menu",
    close: "Close",
    language: "Language",
    skipToContent: "Skip to main content",
  },
  leadForm: {
    headline: "Request a free consultation",
    fullName: "Full name",
    phone: "Phone",
    email: "Email",
    optional: "(optional)",
    whatHappened: "What happened?",
    typeOfMatter: "Type of matter",
    whereDidItHappen: "Where did it happen?",
    dateOfIncident: "Date of incident",
    submit: "Request Free Consultation",
    sending: "Sending…",
    successTitle: "Your request is in.",
    successBody:
      "We'll call you back within one business hour during office hours.",
  },
  footer: {
    attorneyAdvertising: "Attorney Advertising",
    languagesLabel: "Languages",
  },
} as const;

export type Dictionary = typeof en;
