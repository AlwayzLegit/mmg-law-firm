import { cn } from "@/lib/utils";

import { INJURY_CATEGORIES } from "./compensation-section";
import { DeadlineCalculator } from "./deadline-calculator";
import { FaultSlider } from "./fault-slider";
import { Eyebrow } from "./primitives/eyebrow";
import { IconTile } from "./primitives/icon-tile";
import { Reveal } from "./primitives/reveal";

// TODO(human): attorney review required — "Know your rights" is new copy
// introduced by the redesign (comparative fault, limitations periods and the
// damages intro). It summarises general California rules and must be verified
// before long-term use. The damages tiles reuse the reviewed-pending
// INJURY_CATEGORIES copy from the practice pages.

/**
 * Know your rights (redesign v2, additive): two interactive illustrations —
 * pure comparative fault and the two limitations clocks — plus the damages
 * categories. Interactive defaults are server-rendered; islands hydrate the
 * inputs only.
 */
export function KnowYourRights({ className }: { className?: string }) {
  return (
    <section className={cn("surface-ink bg-background text-foreground border-cream/8 border-t", className)}>
      <div className="container-page section-pad">
        <Reveal className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <Eyebrow>Know your rights</Eyebrow>
            <h2 className="text-display text-cream mt-3.5 max-w-[20ch] font-semibold">
              Three facts that shape every California injury claim.
            </h2>
          </div>
          <p className="text-cream/70 max-w-[44ch] text-base">
            Try the tools below. They illustrate the general rules — your case
            may fall under an exception, so call and we&apos;ll tell you exactly
            where you stand.
          </p>
        </Reveal>

        <Reveal delay={80} className="mt-9 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
          <article className="bg-ink-soft border-cream/10 flex flex-col rounded-[18px] border px-8 py-[30px] max-sm:px-6">
            <p className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Pure comparative fault</p>
            <h3 className="font-display text-cream mt-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">
              Partly at fault? You can still recover.
            </h3>
            <p className="text-cream/70 mt-2 text-[14.5px]">
              California reduces your recovery by your share of fault — it doesn&apos;t erase it. Drag to see how.
            </p>
            <FaultSlider />
            <p className="text-cream/45 mt-auto pt-[18px] text-xs">
              Illustration of the general rule only. Insurers routinely overstate a claimant&apos;s share of fault — we
              negotiate that percentage down or eliminate it.
            </p>
          </article>

          <article className="bg-ink-soft border-cream/10 flex flex-col rounded-[18px] border px-8 py-[30px] max-sm:px-6">
            <p className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Statute of limitations</p>
            <h3 className="font-display text-cream mt-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">
              Deadlines that matter.
            </h3>
            <p className="text-cream/70 mt-2 text-[14.5px]">
              Pick the date of the incident to see the two clocks that usually apply.
            </p>
            <DeadlineCalculator />
          </article>
        </Reveal>

        <Reveal delay={140} className="bg-ink-soft border-cream/10 mt-5 rounded-[18px] border px-8 py-[30px] max-sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Damages</p>
              <h3 className="font-display text-cream mt-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">
                What compensation can cover
              </h3>
            </div>
            <p className="text-cream/70 max-w-[52ch] text-[14.5px]">
              We build each category with documentation — medical records, wage statements, expert opinions — so
              nothing is left on the table.
            </p>
          </div>
          <ul className="m-0 mt-6 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 p-0">
            {INJURY_CATEGORIES.map((c) => (
              <li
                key={c.title}
                className="bg-cream/4 border-cream/8 hover:bg-gold/10 rounded-[14px] border px-[18px] py-5 transition-colors"
              >
                <IconTile size="lg" tone="gold">
                  <c.icon aria-hidden />
                </IconTile>
                <p className="font-display text-cream mt-3.5 text-[19px] leading-[1.15] font-semibold tracking-[-0.01em]">
                  {c.title}
                </p>
                <p className="text-cream/60 mt-1.5 text-[13px] leading-[1.55]">{c.body}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
