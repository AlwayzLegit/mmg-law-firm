import Link from "next/link";

import { FIRM } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Your California Privacy Rights (CCPA / CPRA)",
  description: `Notice of California consumer rights under the CCPA and CPRA, and how to exercise them with ${FIRM.legalName}.`,
  path: "/legal/ccpa",
});

// TODO(human): attorney must review CCPA/CPRA disclosures, including the
// categories of personal information collected and any "sharing" determinations,
// before publishing publicly.

export default function CcpaPage() {
  return (
    <article className="container-prose py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        Your California Privacy Rights
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Notice under the California Consumer Privacy Act (CCPA) and California
        Privacy Rights Act (CPRA).
      </p>

      <div className="mt-10 space-y-6 leading-relaxed text-muted-foreground">
        <p>
          California residents have the following rights regarding their
          personal information:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong className="text-foreground">Right to know.</strong> Request
            disclosure of the categories and specific pieces of personal
            information we have collected about you.
          </li>
          <li>
            <strong className="text-foreground">Right to delete.</strong>{" "}
            Request that we delete personal information we have collected about
            you, subject to legal-hold and conflict-check obligations that
            apply to attorneys.
          </li>
          <li>
            <strong className="text-foreground">Right to correct.</strong>{" "}
            Request correction of inaccurate personal information.
          </li>
          <li>
            <strong className="text-foreground">Right to opt out.</strong>{" "}
            Direct us not to &quot;sell&quot; or &quot;share&quot; your personal
            information. We do not sell personal information.
          </li>
          <li>
            <strong className="text-foreground">Right to non-discrimination.</strong>{" "}
            We will not discriminate against you for exercising any of these
            rights.
          </li>
        </ul>

        <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
          How to make a request
        </h2>
        <p>
          You may submit a verifiable consumer request by emailing{" "}
          <a
            href={`mailto:${FIRM.email}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {FIRM.email}
          </a>
          {" "}with the subject &quot;CCPA Request,&quot; or by calling{" "}
          <a
            href={`tel:${FIRM.phoneTel}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            {FIRM.phone}
          </a>
          . We will need to verify your identity before responding.
        </p>

        <p>
          See our full{" "}
          <Link
            href="/legal/privacy"
            className="text-primary underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>{" "}
          for additional detail on the categories of information we collect and
          how it is used.
        </p>
      </div>
    </article>
  );
}
