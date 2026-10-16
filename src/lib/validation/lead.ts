import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import { PRACTICE_AREA_OPTIONS } from "@/lib/data/practice-area-options";

// Zod 4 probes `Function("")` to decide whether it may JIT-compile object
// parsers. Under our CSP (no `unsafe-eval`) that probe is a logged violation
// on every page with a lead form, so opt out of the JIT path.
z.config({ jitless: true });

const PRACTICE_SLUGS = PRACTICE_AREA_OPTIONS.map((p) => p.slug);

const PreferredContact = z.enum(["phone", "email", "text"]);

/**
 * Schema for the public lead form. Used by both the client-side validation
 * (react-hook-form + zodResolver) and the server-side route handler. Mirrors
 * the columns in Supabase `leads`. PII is restricted: no file uploads, no
 * detailed medical history — just a brief plain-text description.
 */
export const LeadSchema = z
  .object({
    full_name: z.string().trim().min(2, "Please enter your full name").max(100),
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .email("Enter a valid email address")
        .max(160)
        .optional(),
    ),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid US phone number")
      .max(40)
      .transform((raw, ctx): string => {
        const parsed = parsePhoneNumberFromString(raw, "US");
        if (!parsed || !parsed.isValid() || parsed.country !== "US") {
          ctx.addIssue({
            code: "custom",
            message: "Enter a valid US phone number",
          });
          return z.NEVER;
        }
        return parsed.number as string; // E.164
      }),
    preferred_contact: PreferredContact.default("phone"),
    practice_area: z.enum(PRACTICE_SLUGS as [string, ...string[]]).optional(),
    county_slug: z.string().trim().max(80).optional(),
    city_slug: z.string().trim().max(80).optional(),
    incident_date: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date format must be YYYY-MM-DD")
        .optional(),
    ),
    description: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .max(
          500,
          "Please keep your message under 500 characters — we'll discuss the details by phone.",
        )
        .optional(),
    ),
    has_attorney: z.boolean().default(false),
    consent_contact: z.literal(true, {
      message: "We need your consent before we can contact you.",
    }),
    // Honeypot. Real users never see or fill this; bots that auto-fill every
    // field will. The server routes any non-empty value to status='spam'
    // without notifying. Kept lax here (optional) so a filled honeypot still
    // parses — we want to silently accept-and-flag, not 400 the bot.
    company: z.string().max(200).optional(),
    turnstileToken: z.string().min(1, "Please complete the CAPTCHA"),
    // Tracking — captured client-side and forwarded.
    utm_source: z.string().max(120).optional(),
    utm_medium: z.string().max(120).optional(),
    utm_campaign: z.string().max(120).optional(),
    utm_term: z.string().max(120).optional(),
    utm_content: z.string().max(120).optional(),
    gclid: z.string().max(200).optional(),
    referrer: z.string().max(2000).optional(),
    source_url: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    // Heuristic spam check: links inside the name field, or 3+ URLs in
    // description. The server-side handler also re-checks and routes
    // suspicious submissions to status='spam' without notifying.
    if (/(https?:\/\/|www\.)/i.test(val.full_name)) {
      ctx.addIssue({
        code: "custom",
        path: ["full_name"],
        message: "Please enter a real name, not a URL.",
      });
    }
    const urlMatches = (val.description ?? "").match(/(https?:\/\/|www\.)/gi);
    if (urlMatches && urlMatches.length >= 3) {
      ctx.addIssue({
        code: "custom",
        path: ["description"],
        message: "Please remove links from the description.",
      });
    }
  });

/** Output: what the server receives after validation + transformation
 *  (phone normalized to E.164, empty optionals coerced to undefined). */
export type LeadInput = z.infer<typeof LeadSchema>;

// The form value type and defaults live in a Zod-free module so the client
// form components can import them without pulling Zod into their bundle.
export { leadFormDefaults, type LeadFormValues } from "./lead-form-values";
