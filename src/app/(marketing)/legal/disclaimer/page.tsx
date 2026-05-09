import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Legal Disclaimer",
  description: `${FIRM.legalName} legal disclaimer regarding attorney advertising, the formation of an attorney-client relationship, and case results.`,
  path: "/legal/disclaimer",
});

// TODO(human): attorney must review and finalize this disclaimer before
// publishing. The version below is a CRPC 7.1-aligned starting point.

export default function DisclaimerPage() {
  return (
    <article className="container-prose py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        Disclaimer
      </h1>

      <div className="mt-10 space-y-6 leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Attorney Advertising.</strong>{" "}
          {DISCLAIMERS.advertising} This advertisement is approved by{" "}
          {FIRM.attorneyName}, California State Bar No. {FIRM.barNumber}, with
          its principal office at {FIRM_FULL_ADDRESS}.
        </p>

        <p>
          <strong className="text-foreground">No legal advice.</strong>{" "}
          {DISCLAIMERS.general}
        </p>

        <p>
          <strong className="text-foreground">No attorney-client relationship.</strong>{" "}
          Submitting information through this website, sending an email, or
          calling our office does not, by itself, create an attorney-client
          relationship. An attorney-client relationship is formed only after we
          have completed conflict-checking, evaluated the facts, and signed a
          written representation agreement with you.
        </p>

        <p>
          <strong className="text-foreground">Past results.</strong>{" "}
          {DISCLAIMERS.results}
        </p>

        <p>
          <strong className="text-foreground">Testimonials.</strong>{" "}
          {DISCLAIMERS.testimonial}
        </p>

        <p>
          <strong className="text-foreground">No guarantee of outcome.</strong>{" "}
          We do not guarantee, warrant, or predict the outcome of any case. Any
          predictions, estimates, or evaluations of likely outcomes are based
          on the facts known at the time and are subject to change as the case
          progresses.
        </p>

        <p>
          <strong className="text-foreground">Sensitive information.</strong>{" "}
          Please do not include detailed medical records, settlement amounts,
          insurance policy numbers, or other sensitive information in our
          public intake form. We will discuss those details securely once we
          have established a representation relationship.
        </p>

        <p>
          <strong className="text-foreground">Jurisdiction.</strong> Our
          attorneys are licensed to practice in the State of California. We do
          not represent clients in matters outside California unless we are
          specifically authorized to do so.
        </p>
      </div>
    </article>
  );
}
