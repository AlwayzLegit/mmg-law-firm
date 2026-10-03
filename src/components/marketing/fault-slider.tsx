"use client";

import * as React from "react";

/**
 * Pure comparative fault illustration: a range input and a recovery bar.
 * The default state (30% fault → 70% recoverable) is in the server HTML.
 */
export function FaultSlider() {
  const [fault, setFault] = React.useState(30);
  const recovery = 100 - fault;
  return (
    <>
      <div className="mt-[26px] flex items-baseline justify-between gap-3">
        <span className="text-cream/55 text-[11px] font-semibold tracking-[0.14em] uppercase">Your share of fault</span>
        <span className="font-display text-gold text-[46px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
          {fault}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={99}
        step={1}
        value={fault}
        onChange={(e) => setFault(Number(e.target.value))}
        aria-label="Your share of fault"
        aria-valuetext={`${fault} percent at fault, ${recovery} percent of damages recoverable`}
        className="accent-gold mt-2.5 block w-full cursor-pointer"
      />
      <div className="bg-cream/10 mt-[22px] h-3.5 overflow-hidden rounded-full" aria-hidden>
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-light to-gold transition-[width] duration-200 ease-out"
          style={{ width: `${recovery}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between gap-3 text-[13.5px]" aria-live="polite">
        <span className="text-cream">
          <strong className="font-bold">{recovery}%</strong> of your damages still recoverable
        </span>
        <span className="text-cream/50">Reduced by {fault}%</span>
      </div>
    </>
  );
}
