/**
 * In-code fallback markdown for the four legal pages. Used when the matching
 * `legal_pages` row isn't published. Once the attorney edits a row at
 * /admin/content/legal/[id] and publishes it, the DB content takes over.
 *
 * Conservative starting templates — not legal advice. The attorney must
 * review and finalize before publishing.
 */

import { FIRM, FIRM_FULL_ADDRESS, DISCLAIMERS } from "@/lib/constants";

export const LEGAL_PAGE_SLUGS = [
  "privacy",
  "disclaimer",
  "ccpa",
  "accessibility",
] as const;

export type LegalPageSlug = (typeof LEGAL_PAGE_SLUGS)[number];

export type LegalPageFallback = {
  slug: LegalPageSlug;
  title: string;
  subtitle: string | null;
  body_md: string;
  meta_description: string;
  display_order: number;
};

const PRIVACY_BODY = `${FIRM.legalName} ("we," "us," or "our") respects your privacy. This Privacy Policy describes how we collect, use, and disclose information about visitors to [mmg-lawfirm.com](/) and individuals who contact us regarding potential representation.

## Information we collect

When you submit our intake form, we collect the contact information and case details you provide (name, phone number, email if provided, city or county, brief description of your matter). We also receive standard analytics information (IP address, browser type, pages viewed, referrer) that helps us operate the site.

## How we use information

We use submitted information to evaluate potential matters, contact you, and follow up about your inquiry. We use analytics information to improve the site and understand which pages help potential clients.

## How we share information

We do not sell your information. We share information with vendors who help us operate the site (for example, our email and form providers) under written confidentiality and data-protection obligations. We may disclose information when required by law.

## Communications and TCPA consent

If you check the contact-consent box on our intake form, you agree to be contacted at the phone number you provided, including by autodialer or text message. Consent is not a condition of service. Reply STOP to opt out of text messages at any time.

## Your California privacy rights

California residents have rights under the CCPA/CPRA, including the right to know what personal information we collect and how it is used, the right to delete personal information (subject to legal-hold obligations), and the right to opt out of any sale or share. See our [CCPA notice](/legal/ccpa) for details on how to exercise these rights.

## Security

We use commercially reasonable safeguards to protect information in our systems. No method of transmission over the Internet is 100% secure. Do not include sensitive medical or financial information in our public intake form — we will discuss those details securely after we connect.

## Contact us

Questions about this policy may be directed to [${FIRM.email}](mailto:${FIRM.email}) or by mail to ${FIRM.legalName}, ${FIRM_FULL_ADDRESS}.`;

const DISCLAIMER_BODY = `**Attorney Advertising.** ${DISCLAIMERS.advertising} This advertisement is approved by ${FIRM.attorneyName}, California State Bar No. ${FIRM.barNumber}, with its principal office at ${FIRM_FULL_ADDRESS}.

**No legal advice.** ${DISCLAIMERS.general}

**No attorney-client relationship.** Submitting information through this website, sending an email, or calling our office does not, by itself, create an attorney-client relationship. An attorney-client relationship is formed only after we have completed conflict-checking, evaluated the facts, and signed a written representation agreement with you.

**Past results.** ${DISCLAIMERS.results}

**Testimonials.** ${DISCLAIMERS.testimonial}

**No guarantee of outcome.** We do not guarantee, warrant, or predict the outcome of any case. Any predictions, estimates, or evaluations of likely outcomes are based on the facts known at the time and are subject to change as the case progresses.

**Sensitive information.** Please do not include detailed medical records, settlement amounts, insurance policy numbers, or other sensitive information in our public intake form. We will discuss those details securely once we have established a representation relationship.

**Jurisdiction.** Our attorneys are licensed to practice in the State of California. We do not represent clients in matters outside California unless we are specifically authorized to do so.`;

const CCPA_BODY = `California residents have the following rights regarding their personal information:

- **Right to know.** Request disclosure of the categories and specific pieces of personal information we have collected about you.
- **Right to delete.** Request that we delete personal information we have collected about you, subject to legal-hold and conflict-check obligations that apply to attorneys.
- **Right to correct.** Request correction of inaccurate personal information.
- **Right to opt out.** Direct us not to "sell" or "share" your personal information. We do not sell personal information.
- **Right to non-discrimination.** We will not discriminate against you for exercising any of these rights.

## How to make a request

You may submit a verifiable consumer request by emailing [${FIRM.email}](mailto:${FIRM.email}) with the subject "CCPA Request," or by calling [${FIRM.phone}](tel:${FIRM.phoneTel}). We will need to verify your identity before responding.

See our full [Privacy Policy](/legal/privacy) for additional detail on the categories of information we collect and how it is used.`;

const ACCESSIBILITY_BODY = `${FIRM.legalName} is committed to making our website usable by everyone, including people with disabilities. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA where practicable, and we are continually working to improve the accessibility of our content.

## What we work on

- Color contrast that meets or exceeds AA on text content
- Keyboard navigation throughout the site, including forms
- Descriptive labels and alternative text on images
- Logical heading structure and landmarks for screen readers
- Touch targets sized for mobile users

## Need help, or found a problem?

If you encounter a barrier accessing any part of this website, or if you would prefer to receive information in a different format, please contact us:

- Email: [${FIRM.email}](mailto:${FIRM.email})
- Phone: [${FIRM.phone}](tel:${FIRM.phoneTel})

We aim to respond within two business days and to provide the information you need in an accessible format.`;

export const LEGAL_PAGE_FALLBACKS: Record<LegalPageSlug, LegalPageFallback> = {
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    subtitle: null,
    body_md: PRIVACY_BODY,
    meta_description: `${FIRM.legalName} privacy policy describing how we collect, use, and protect personal information submitted through our website.`,
    display_order: 10,
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Legal Disclaimer",
    subtitle: null,
    body_md: DISCLAIMER_BODY,
    meta_description: `${FIRM.legalName} legal disclaimer regarding attorney advertising, the formation of an attorney-client relationship, and case results.`,
    display_order: 20,
  },
  ccpa: {
    slug: "ccpa",
    title: "Your California Privacy Rights",
    subtitle:
      "Notice under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA).",
    body_md: CCPA_BODY,
    meta_description: `Notice of California consumer rights under the CCPA and CPRA, and how to exercise them with ${FIRM.legalName}.`,
    display_order: 30,
  },
  accessibility: {
    slug: "accessibility",
    title: "Accessibility Statement",
    subtitle: null,
    body_md: ACCESSIBILITY_BODY,
    meta_description: `${FIRM.legalName} accessibility statement and contact information for accessibility-related feedback.`,
    display_order: 40,
  },
};

export function isLegalPageSlug(s: string): s is LegalPageSlug {
  return (LEGAL_PAGE_SLUGS as readonly string[]).includes(s);
}
