"use client";

import { useEffect } from "react";

import { INJURY_DEADLINE_NOTE } from "@/lib/data/approved-accident-copy";

function addMonths(d: Date, m: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
}
const fmt = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Makes the two illustrations on /resources interactive (comparative-fault
 * slider and incident-date deadline helper). The markup is server-rendered
 * with default values; this only updates the `data-tool-out` targets.
 */
export function V3ResourceTools() {
  useEffect(() => {
    const out = (k: string) => document.querySelectorAll<HTMLElement>(`[data-tool-out="${k}"]`);
    const fault = document.querySelector<HTMLInputElement>('input[data-tool="fault"]');
    const date = document.querySelector<HTMLInputElement>('input[data-tool="incident"]');

    const onFault = () => {
      if (!fault) return;
      const f = Number(fault.value);
      out("fault").forEach((e) => (e.textContent = `${f}%`));
      out("recovery").forEach((e) => (e.textContent = `${100 - f}%`));
      out("bar").forEach((e) => (e.style.width = `${100 - f}%`));
      fault.setAttribute("aria-valuetext", `${f}% fault, ${100 - f}% recoverable`);
    };
    const onDate = () => {
      if (!date) return;
      const inc = date.value ? new Date(`${date.value}T00:00:00`) : null;
      const gov = inc ? addMonths(inc, 6) : null;
      const gen = inc ? addMonths(inc, 24) : null;
      out("gov").forEach((e) => (e.textContent = gov ? `6 months → ${fmt(gov)}` : "6 months"));
      out("gen").forEach((e) => (e.textContent = gen ? `2 years → ${fmt(gen)}` : "2 years"));
      // Date examples cannot determine a visitor's legal deadline. Preserve
      // the approved qualification for every input, including past dates.
      out("note").forEach((e) => (e.textContent = INJURY_DEADLINE_NOTE));
    };

    fault?.addEventListener("input", onFault);
    date?.addEventListener("change", onDate);
    date?.addEventListener("input", onDate);
    return () => {
      fault?.removeEventListener("input", onFault);
      date?.removeEventListener("change", onDate);
      date?.removeEventListener("input", onDate);
    };
  }, []);
  return null;
}
