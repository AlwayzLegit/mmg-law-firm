"use client";

import * as React from "react";

import { FIRM } from "@/lib/constants";

const DEFAULT_NOTE =
  "Exceptions run in both directions — discovery rules, minors, continuing violations, out-of-state defendants — so don't assume your deadline has passed, or that you have time to spare.";

function addMonths(d: Date, m: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Statute-of-limitations illustration: pick an incident date and see the two
 * clocks that usually apply (Gov. Code §911.2 six months; CCP §335.1 two
 * years). Labels without a date are in the server HTML.
 */
export function DeadlineCalculator() {
  const [incident, setIncident] = React.useState("");
  const inc = incident ? new Date(`${incident}T12:00:00`) : null;
  const gov = inc && !Number.isNaN(inc.getTime()) ? addMonths(inc, 6) : null;
  const gen = inc && !Number.isNaN(inc.getTime()) ? addMonths(inc, 24) : null;
  const today = new Date();

  let note = DEFAULT_NOTE;
  if (gen && gen < today) {
    note = `The general two-year window for this date appears to have closed. Exceptions exist — call ${FIRM.phone} now and we'll check whether one applies to you.`;
  } else if (gov && gov < today) {
    note =
      "The six-month government-claim window for this date appears to have closed; the general two-year window may still be open. Call and we'll confirm which rule applies.";
  }

  return (
    <>
      <label className="mt-[22px] flex flex-wrap items-center gap-3.5">
        <span className="text-cream/55 text-[11px] font-semibold tracking-[0.14em] uppercase">Date of incident</span>
        <input
          type="date"
          value={incident}
          max={today.toISOString().slice(0, 10)}
          onChange={(e) => setIncident(e.target.value)}
          className="border-cream/18 bg-cream/6 text-cream focus:border-gold h-[42px] rounded-[10px] border px-3 text-sm outline-none [color-scheme:dark]"
        />
      </label>
      <div className="mt-6 grid gap-[18px]">
        <Clock
          label="Government entities"
          value={gov ? `6 months → ${fmt(gov)}` : "6 months"}
          width="25%"
          tone="light"
          caption="Written claim within six months (Government Code §911.2) — city vehicles, public buses, dangerous public roads."
        />
        <Clock
          label="Most injury claims"
          value={gen ? `2 years → ${fmt(gen)}` : "2 years"}
          width="100%"
          tone="gold"
          caption="Two years from the injury (Code of Civil Procedure §335.1). Miss it and the court will almost always dismiss the case."
        />
      </div>
      <p className="text-cream/45 mt-auto pt-[18px] text-xs" aria-live="polite">
        {note}
      </p>
    </>
  );
}

function Clock({
  label,
  value,
  width,
  tone,
  caption,
}: {
  label: string;
  value: string;
  width: string;
  tone: "light" | "gold";
  caption: string;
}) {
  const color = tone === "light" ? "text-gold-light" : "text-gold";
  const bg = tone === "light" ? "bg-gold-light" : "bg-gold";
  return (
    <div>
      <div className="flex justify-between gap-3 text-[13.5px]">
        <span className="text-cream font-semibold">{label}</span>
        <span className={`${color} font-semibold tabular-nums`}>{value}</span>
      </div>
      <div className="bg-cream/10 mt-2 h-2.5 overflow-hidden rounded-full" aria-hidden>
        <div className={`${bg} h-full rounded-full`} style={{ width }} />
      </div>
      <p className="text-cream/50 mt-1.5 text-xs">{caption}</p>
    </div>
  );
}
