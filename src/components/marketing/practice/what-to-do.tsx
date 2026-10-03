import { DISCLAIMERS } from "@/lib/constants";

/** "What to do right away": paper-2 panel with numbered white cards. */
export function WhatToDoPanel({
  items,
  heading = "What to do right away",
  id,
}: {
  items: string[];
  heading?: string;
  id?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section id={id} className="surface-paper-2 bg-background border-line mt-10 scroll-mt-[130px] rounded-[18px] border p-8 max-sm:p-5">
      <h2 className="text-display-xs font-semibold">{heading}</h2>
      <ol className="m-0 mt-5 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 p-0">
        {items.map((line, i) => (
          <li key={line} className="bg-card border-line flex items-start gap-3 rounded-xl border px-4 py-3.5">
            <span className="bg-ink text-gold inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-xs font-semibold">
              {i + 1}
            </span>
            <span className="text-sm leading-[1.5]">{line}</span>
          </li>
        ))}
      </ol>
      <p className="text-stone mt-[18px] text-xs">{DISCLAIMERS.general}</p>
    </section>
  );
}
