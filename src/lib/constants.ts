export const FIRM = {
  legalName: "MMG Law Firm",
  attorneyName: "Mihran M. Ghazaryan",
  barNumber: "311455",
  phone: "(818) 568-5818",
  phoneTel: "+18185685818",
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
  hours: "Mon–Fri 9:00–18:00",
  // TODO(human): confirm languages spoken by the attorney.
  languages: ["English", "Armenian", "Russian"],
  // TODO(human): confirm founding year of the firm.
  founded: 2018,
  socials: {
    yelp: "https://www.yelp.com/biz/mmg-law-firm-glendale",
    superLawyers:
      "https://profiles.superlawyers.com/california/glendale/lawfirm/mmg-law-firm/68073bd3-6378-44e2-9f67-582e4c41c5d5.html",
    // TODO(human): add real Avvo / Justia / LinkedIn URLs once confirmed.
    avvo: "",
    justia: "",
    linkedin: "",
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
