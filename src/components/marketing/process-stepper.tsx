"use client";

import * as React from "react";

import type { ProcessStep } from "@/lib/data/practice-area-content";
import { cn } from "@/lib/utils";

/**
 * "Your case, step by step" — four numbered dots on a gold progress track and
 * the active step's copy. Every step body is server-rendered (toggled with
 * `hidden`) so the process text stays indexable.
 */
export function ProcessStepper({ steps, className }: { steps: ProcessStep[]; className?: string }) {
  const [step, setStep] = React.useState(0);
  const last = steps.length - 1;
  return (
    <div className={cn("px-9 pt-8 pb-9 max-sm:px-6", className)}>
      <p className="text-eyebrow m-0 text-xs font-semibold tracking-[0.16em] uppercase">Your case, step by step</p>
      <ol className="relative m-0 mt-5 grid list-none grid-cols-4 p-0 max-sm:grid-cols-2 max-sm:gap-y-5">
        <span aria-hidden className="bg-ink/14 absolute top-[17px] right-[18px] left-[18px] h-px max-sm:hidden" />
        <span
          aria-hidden
          className="bg-gold absolute top-[17px] left-[18px] h-px transition-[width] duration-[400ms] ease-out max-sm:hidden"
          style={{ width: `calc(${last > 0 ? step / last : 0} * (100% - 36px))` }}
        />
        {steps.map((s, i) => {
          const reached = i <= step;
          return (
            <li key={s.title} className="relative">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className="flex w-full flex-col items-start gap-3 pr-3 text-left"
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-300",
                    reached ? "bg-gold border-gold text-ink" : "bg-card border-ink/20 text-stone",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("text-[15px] leading-[1.3] font-semibold", i === step ? "text-foreground" : "text-stone")}>
                  {s.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="border-line mt-7 border-t pt-6">
        <p className="text-stone m-0 text-[11px] tracking-[0.16em] uppercase" aria-live="polite">
          Step {step + 1} of {steps.length}
        </p>
        {steps.map((s, i) => (
          <div key={s.title} hidden={i !== step}>
            <h3 className="font-display mt-2 text-[30px] leading-[1.1] font-semibold tracking-[-0.02em]">{s.title}</h3>
            <p className="text-stone mt-2.5 max-w-[60ch] text-[15.5px] leading-[1.65]">{s.body}</p>
          </div>
        ))}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setStep((n) => Math.max(0, n - 1))}
            disabled={step === 0}
            className="border-ink/20 bg-card hover:bg-paper h-10 rounded-full border px-4 text-[13px] font-semibold transition-colors disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep((n) => (n + 1) % steps.length)}
            className="bg-ink text-cream hover:bg-ink-hover h-10 rounded-full px-4 text-[13px] font-semibold transition-colors"
          >
            {step === last ? "Start over" : "Next step"}
          </button>
        </div>
      </div>
    </div>
  );
}
