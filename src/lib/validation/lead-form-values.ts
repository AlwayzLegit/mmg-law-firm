/** Input: what the form holds before submission. Declared explicitly rather
 *  than via z.input — preprocess() collapses input types to `unknown`,
 *  which doesn't play nicely with react-hook-form's `field.value` typing.
 *
 *  Kept free of Zod so client components can import it cheaply; the schema
 *  itself lives in `./lead` and is loaded on demand by `lazyLeadResolver`. */
export type LeadFormValues = {
  full_name: string;
  email?: string;
  phone: string;
  preferred_contact?: "phone" | "email" | "text";
  practice_area?: string;
  county_slug?: string;
  city_slug?: string;
  incident_date?: string;
  description?: string;
  has_attorney?: boolean;
  consent_contact: boolean;
  company?: string;
  turnstileToken: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  referrer?: string;
  source_url?: string;
  landing_url?: string;
  locale?: string;
};

export const leadFormDefaults: LeadFormValues = {
  full_name: "",
  email: undefined,
  phone: "",
  preferred_contact: "phone",
  practice_area: undefined,
  county_slug: undefined,
  city_slug: undefined,
  incident_date: undefined,
  description: undefined,
  has_attorney: false,
  consent_contact: false,
  company: "",
  turnstileToken: "",
};

