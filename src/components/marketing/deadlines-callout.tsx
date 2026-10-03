import { FIRM } from "@/lib/constants";

import { DeadlineCalculator } from "./deadline-calculator";

// TODO(human): attorney review required — statute-of-limitations summary,
// AI-drafted. Confirm the framing of CCP §335.1 and Gov. Code §911.2 (injury)
// and the CRD/FEHA and Labor Code deadlines (employment) before long-term use.

type Props = {
  /** Practice family. "employment" swaps the PI deadlines for the CRD/FEHA
   *  administrative-exhaustion and Labor Code timelines. Undefined ⇒ injury. */
  category?: "injury" | "employment";
  id?: string;
};

/**
 * "Deadlines that matter" — ink panel. States the headline California
 * deadlines plainly, then pushes the reader to call early — exceptions exist
 * in both directions, and we never want a visitor self-diagnosing that their
 * claim is dead. Injury pages also get the two-clock deadline calculator.
 */
export function DeadlinesCallout({ category, id }: Props) {
  const isEmployment = category === "employment";
  return (
    <section
      id={id}
      className="surface-ink bg-background text-foreground mt-10 scroll-mt-[130px] rounded-[18px] p-8 max-sm:p-5"
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-start gap-7">
        <div className="text-cream/72 space-y-3 text-[14.5px] leading-[1.6]">
          <h2 className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Deadlines that matter</h2>
          <p className="text-cream !mt-2.5 text-display-xs leading-[1.1] font-semibold tracking-[-0.02em]">
            {isEmployment ? "Several clocks can apply." : "Two clocks usually apply."}
          </p>
          {isEmployment ? (
            <>
              <p>
                <strong className="text-cream font-semibold">
                  Most California FEHA claims require a complaint with the Civil
                  Rights Department first
                </strong>{" "}
                — generally within three years of the discrimination, harassment,
                or retaliation (Gov. Code §12960). You then have one year from the
                right-to-sue notice to file in court.
              </p>
              <p>
                <strong className="text-cream font-semibold">
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
                <strong className="text-cream font-semibold">
                  Most California personal-injury claims must be filed within two
                  years
                </strong>{" "}
                of the injury (Code of Civil Procedure §335.1). Miss the window
                and the court will almost always dismiss the case, no matter how
                strong it is.
              </p>
              <p>
                <strong className="text-cream font-semibold">
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
            <a href={`tel:${FIRM.phoneTel}`} className="text-gold font-semibold no-underline">
              {FIRM.phone}
            </a>{" "}
            and we&apos;ll tell you exactly where you stand.
          </p>
        </div>
        {!isEmployment ? (
          <div className="bg-ink-soft border-cream/10 flex flex-col rounded-[14px] border p-[22px]">
            <DeadlineCalculator />
          </div>
        ) : null}
      </div>
    </section>
  );
}
