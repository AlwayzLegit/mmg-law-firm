/**
 * Firm-level constants. Attorney-specific facts (bio, bar admission date,
 * education, languages, sameAs URLs) live in the `attorney_profiles` table
 * and are edited at /admin/content/attorneys/[id]. The fields below are
 * either truly firm-level (phone, address, hours) or are seed fallbacks
 * used only when Supabase isn't yet configured — `getAttorneyProfile()` in
 * src/lib/data/attorney.ts is the canonical source for everything else.
 */
export const FIRM = {
  legalName: "MMG Law Firm",
  /** Lead attorney name. Canonical source: attorney_profiles.full_name where slug='mihran-ghazaryan'. */
  attorneyName: "Mihran M. Ghazaryan",
  /** Lead attorney bar #. Canonical source: attorney_profiles.bar_number. */
  barNumber: "311455",
  // Phone matches the number published on the live mmg-lawfirm.com site
  // and on Yelp, Super Lawyers, and the state bar listing (May 2026).
  // If the firm runs a separate tracking line for this new site, update
  // here — every page-level link routes through these two values.
  phone: "(818) 539-7969",
  phoneTel: "+18185397969",
  email: "info@mmg-lawfirm.com",
  intakeEmail: "intake@mmg-lawfirm.com",
  address: {
    street: "100 W Broadway, Suite 540",
    city: "Glendale",
    state: "CA",
    zip: "91210",
    country: "US",
  },
  geo: { lat: 34.1466, lng: -118.2553 },
  hours: "Mon–Fri 9:00 AM–6:00 PM",
  /** Languages — seed fallback. Canonical source: attorney_profiles.languages. */
  languages: ["English", "Armenian", "Russian"],
  /** Founding year — seed fallback. Canonical source: firm_settings.founded_year. */
  founded: 2018,
  socials: {
    yelp: "https://www.yelp.com/biz/mmg-law-firm-glendale",
    /** Lead attorney's Super Lawyers profile — seed fallback.
     *  Canonical source: attorney_profiles.super_lawyers_url. */
    superLawyers:
      "https://profiles.superlawyers.com/california/glendale/lawfirm/mmg-law-firm/68073bd3-6378-44e2-9f67-582e4c41c5d5.html",
    /** Avvo / Justia / LinkedIn — seed fallbacks, sourced from the live
     *  mmg-lawfirm.com site + the public attorney directories (May 2026).
     *  Canonical source: attorney_profiles.{avvo_url, justia_url, linkedin_url}. */
    avvo: "https://www.avvo.com/attorneys/91210-ca-mihran-ghazaryan-4850655.html",
    justia: "https://lawyers.justia.com/lawyer/mihran-m-ghazaryan-1552557",
    linkedin: "https://www.linkedin.com/in/mihran-ghazaryan-bab30050/",
  },
} as const;

export const FIRM_FULL_ADDRESS = `${FIRM.address.street}, ${FIRM.address.city}, ${FIRM.address.state} ${FIRM.address.zip}`;

export const DISCLAIMERS = {
  general:
    "The information on this website is for general information purposes only. Nothing on this site should be taken as legal advice for any individual case or situation. This information is not intended to create, and receipt or viewing does not constitute, an attorney-client relationship.",
  results:
    "Past results do not guarantee a similar outcome. Each case is different and must be evaluated on its own merits.",
  testimonial:
    "Testimonials reflect the experiences of individual clients. Results vary and depend on the specific facts of each case.",
  advertising: "This website is an advertisement for legal services.",
} as const;

export const TCPA_CONSENT_TEXT =
  "By checking this box, I agree to receive calls and text messages from MMG Law Firm at the number provided, including by autodialer. Consent is not a condition of service. Message and data rates may apply. Reply STOP to opt out.";

export const SITE = {
  name: "MMG Law Firm",
  description:
    "California personal-injury attorney based in Glendale. Free consultation. No fee unless we win.",
  /** Generated at build time by src/app/opengraph-image.tsx. */
  defaultOgImage: "/opengraph-image",
} as const;

export type FirmConfig = typeof FIRM;
