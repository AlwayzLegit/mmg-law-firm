import Link from "next/link";

import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: `${FIRM.legalName} privacy policy describing how we collect, use, and protect personal information submitted through our website.`,
  path: "/legal/privacy",
});

// TODO(human): replace this template with attorney-reviewed copy before
// publishing publicly. The text below is a starting point only and is NOT
// legal advice. A licensed attorney must review and finalize.

export default function PrivacyPage() {
  const updated = "Last updated: " + new Date().getFullYear();
  return (
    <article className="container-prose py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{updated}</p>

      <div className="prose prose-neutral mt-10 max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
        <p className="lead">
          {FIRM.legalName} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          respects your privacy. This Privacy Policy describes how we collect,
          use, and disclose information about visitors to{" "}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            mmg-lawfirm.com
          </Link>{" "}
          and individuals who contact us regarding potential representation.
        </p>

        <h2>Information we collect</h2>
        <p>
          When you submit our intake form, we collect the contact information
          and case details you provide (name, phone number, email if provided,
          city or county, brief description of your matter). We also receive
          standard analytics information (IP address, browser type, pages
          viewed, referrer) that helps us operate the site.
        </p>

        <h2>How we use information</h2>
        <p>
          We use submitted information to evaluate potential matters, contact
          you, and follow up about your inquiry. We use analytics information
          to improve the site and understand which pages help potential
          clients.
        </p>

        <h2>How we share information</h2>
        <p>
          We do not sell your information. We share information with vendors
          who help us operate the site (for example, our email and form
          providers) under written confidentiality and data-protection
          obligations. We may disclose information when required by law.
        </p>

        <h2>Communications and TCPA consent</h2>
        <p>
          If you check the contact-consent box on our intake form, you agree to
          be contacted at the phone number you provided, including by autodialer
          or text message. Consent is not a condition of service. Reply STOP to
          opt out of text messages at any time.
        </p>

        <h2>Your California privacy rights</h2>
        <p>
          California residents have rights under the CCPA/CPRA, including the
          right to know what personal information we collect and how it is used,
          the right to delete personal information (subject to legal-hold
          obligations), and the right to opt out of any sale or share. See our{" "}
          <Link
            href="/legal/ccpa"
            className="text-primary underline-offset-4 hover:underline"
          >
            CCPA notice
          </Link>{" "}
          for details on how to exercise these rights.
        </p>

        <h2>Security</h2>
        <p>
          We use commercially reasonable safeguards to protect information in
          our systems. No method of transmission over the Internet is 100%
          secure. Do not include sensitive medical or financial information in
          our public intake form — we will discuss those details securely after
          we connect.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy may be directed to{" "}
          <a
            href={`mailto:${FIRM.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {FIRM.email}
          </a>{" "}
          or by mail to {FIRM.legalName}, {FIRM_FULL_ADDRESS}.
        </p>
      </div>
    </article>
  );
}
