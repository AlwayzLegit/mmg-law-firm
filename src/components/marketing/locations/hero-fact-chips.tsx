import type { LucideIcon } from "lucide-react";

export type HeroFactChip = { icon: LucideIcon; k: string; v: string };

/** Glass fact chips for the right side of location heroes. */
export function HeroFactChips({ facts }: { facts: HeroFactChip[] }) {
  return (
    <ul className="m-0 grid w-full max-w-[380px] list-none gap-2.5 p-0 lg:justify-self-end">
      {facts.map((f) => (
        <li
          key={f.k}
          className="bg-ink/60 border-cream/12 flex items-center gap-3 rounded-xl border px-4 py-3.5 backdrop-blur-md"
        >
          <f.icon className="text-gold h-4 w-4 flex-none" aria-hidden />
          <span className="text-cream/85 text-[13.5px]">
            <strong className="text-cream font-semibold">{f.k}</strong> {f.v}
          </span>
        </li>
      ))}
    </ul>
  );
}
