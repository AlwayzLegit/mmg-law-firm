import { Clock } from "lucide-react";

import { FIRM } from "@/lib/constants";

// TODO(human): attorney review required — statute-of-limitations summary,
// AI-drafted. Confirm the framing of CCP §335.1 and Gov. Code §911.2 (injury)
// and the CRD/FEHA and Labor Code deadlines (employment) before long-term use.

type Props = {
  /** Practice family. "employment" swaps the PI deadlines for the CRD/FEHA
   *  administrative-exhaustion and Labor Code timelines. Undefined ⇒ injury. */
  category?: "injury" | "employment";
};

/**
 * "Deadlines that matter" callout for city × practice landing pages.
 * States the headline California deadlines plainly, then pushes the reader to
 * call early — exceptions exist in both directions, and we never want a
 * visitor self-diagnosing that their claim is dead. The category controls
 * whether the personal-injury or employment-law deadlines are shown.
 */
export function DeadlinesCallout({ category }: Props) {
  const isEmployment = category === "employment";
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-[var(--color-gold-500)]/30 bg-card">
      <div className="border-b border-[var(--color-gold-500)]/20 bg-[var(--color-gold-500)]/8 px-8 py-5">
        <h2 className="flex items-center gap-3 font-display text-xl font-medium tracking-tight md:text-2xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-gold-500)]/15 text-[var(--color-gold-700,#a98442)]">
            <Clock className="h-5 w-5" aria-hidden />
          </span>
          Deadlines that matter
        </h2>
      </div>
      <div className="space-y-4 px-8 py-6 text-sm leading-relaxed text-muted-foreground">
        {isEmployment ? (
          <>
            <p>
              <strong className="text-foreground">
                Most California FEHA claims require a complaint with the Civil
                Rights Department first
              </strong>{" "}
              — generally within three years of the discrimination, harassment,
              or retaliation (Gov. Code §12960). You then have one year from the
              right-to-sue notice to file in court.
            </p>
            <p>
              <strong className="text-foreground">
                Other employment deadlines run on their own clocks
              </strong>{" "}
              — unpaid-wage claims generally reach back three years (up to four
              under the UCL), and a wrongful-termination-in-violation-of-public-
              policy claim runs two years. Federal EEOC charges can be far
              shorter.
            </p>
          </>
        ) : (
          <>
            <p>
              <strong className="text-foreground">
                Most California personal-injury claims must be filed within two
                years
              </strong>{" "}
              of the injury (Code of Civil Procedure §335.1). Miss the window
              and the court will almost always dismiss the case, no matter how
              strong it is.
            </p>
            <p>
              <strong className="text-foreground">
                Claims against government entities are much shorter
              </strong>{" "}
              — generally a written claim within six months (Government Code
              §911.2). Crashes involving city vehicles, public buses, or
              dangerous public-road conditions can fall under this rule.
            </p>
          </>
        )}
        <p>
          Exceptions exist in both directions — discovery rules, minors,
          continuing violations, out-of-state defendants — so don&apos;t assume
          your deadline has passed or that you have time to spare. Call{" "}
          <a
            href={`tel:${FIRM.phoneTel}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {FIRM.phone}
          </a>{" "}
          and we&apos;ll tell you exactly where you stand.
        </p>
      </div>
    </section>
  );
}
