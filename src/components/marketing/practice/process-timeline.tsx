import type { ProcessStep } from "@/lib/data/practice-area-content";

import { Eyebrow } from "../primitives/eyebrow";

/** Vertical process timeline: gold numbered circles on a hairline rail. */
export function ProcessTimeline({
  steps,
  heading = "How we work",
  id,
}: {
  steps: ProcessStep[];
  heading?: string;
  id?: string;
}) {
  if (steps.length === 0) return null;
  return (
    <section id={id} className="mt-14 scroll-mt-[130px]">
      <Eyebrow>Your case, step by step</Eyebrow>
      <h2 className="text-display-sm mt-3 font-semibold">{heading}</h2>
      <ol className="relative m-0 mt-7 list-none p-0">
        <span aria-hidden className="bg-ink/14 absolute top-5 bottom-5 left-[19px] w-px" />
        {steps.map((step, i) => (
          <li key={step.title} className="relative grid grid-cols-[40px_1fr] gap-5 pb-7 last:pb-0">
            <span className="bg-gold text-ink ring-background inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ring-[6px]">
              {i + 1}
            </span>
            <div className="pt-1.5">
              <h3 className="font-display text-[22px] leading-[1.2] font-semibold tracking-[-0.01em]">{step.title}</h3>
              <p className="text-stone mt-1.5 max-w-[64ch] text-[14.5px] leading-[1.6]">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
