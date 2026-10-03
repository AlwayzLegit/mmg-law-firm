import { DISCLAIMERS } from "@/lib/constants";

/** "About injuries in {place}" — attorney-written local statistics panel. */
export function LocalStats({ place, body }: { place: string; body: string }) {
  return (
    <section className="surface-paper-2 bg-background border-line rounded-[18px] border p-7 max-sm:p-5">
      <h2 className="text-display-xs font-semibold">About injuries in {place}</h2>
      <div className="text-stone mt-3.5 text-[15.5px] leading-[1.65] whitespace-pre-line">{body}</div>
      <p className="text-stone mt-5 text-xs">{DISCLAIMERS.general}</p>
    </section>
  );
}
