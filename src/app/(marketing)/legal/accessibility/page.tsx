import { FIRM } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Accessibility Statement",
  description: `${FIRM.legalName} accessibility statement and contact information for accessibility-related feedback.`,
  path: "/legal/accessibility",
});

// TODO(human): attorney must review this statement. The text below documents
// our good-faith ADA / WCAG commitment and provides an accessibility contact.

export default function AccessibilityPage() {
  return (
    <article className="container-prose py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        Accessibility Statement
      </h1>

      <div className="mt-10 space-y-6 leading-relaxed text-muted-foreground">
        <p>
          {FIRM.legalName} is committed to making our website usable by
          everyone, including people with disabilities. We aim to meet the Web
          Content Accessibility Guidelines (WCAG) 2.1 Level AA where
          practicable, and we are continually working to improve the
          accessibility of our content.
        </p>

        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
          What we work on
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Color contrast that meets or exceeds AA on text content</li>
          <li>Keyboard navigation throughout the site, including forms</li>
          <li>Descriptive labels and alternative text on images</li>
          <li>Logical heading structure and landmarks for screen readers</li>
          <li>Touch targets sized for mobile users</li>
        </ul>

        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
          Need help, or found a problem?
        </h2>
        <p>
          If you encounter a barrier accessing any part of this website, or if
          you would prefer to receive information in a different format, please
          contact us:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Email:{" "}
            <a
              href={`mailto:${FIRM.email}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {FIRM.email}
            </a>
          </li>
          <li>
            Phone:{" "}
            <a
              href={`tel:${FIRM.phoneTel}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {FIRM.phone}
            </a>
          </li>
        </ul>
        <p>
          We aim to respond within two business days and to provide the
          information you need in an accessible format.
        </p>
      </div>
    </article>
  );
}
