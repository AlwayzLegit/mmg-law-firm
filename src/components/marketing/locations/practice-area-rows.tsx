import { createElement } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { cn } from "@/lib/utils";

import { resolveIcon } from "../primitives/resolve-icon";

const ORDERED = [...PRACTICE_AREAS].sort((a, b) => a.displayOrder - b.displayOrder);

/**
 * The 15 practice areas as icon rows. `hrefFor` decides the link (a city ×
 * practice page when one is published, else the hub — never a 404) and
 * `localSlugs` marks rows that have a local page with a "LOCAL" chip.
 */
export function PracticeAreaRows({
  hrefFor,
  localSlugs,
  nameAs = "span",
  className,
}: {
  hrefFor: (slug: string) => string;
  localSlugs?: Set<string>;
  /** County pages keep their h3s for each area name. */
  nameAs?: "span" | "h3";
  className?: string;
}) {
  return (
    <ul className={cn("m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2.5 p-0", className)}>
      {ORDERED.map((area) => {
        const local = localSlugs?.has(area.slug) ?? false;
        return (
          <li key={area.slug}>
            <Link
              href={hrefFor(area.slug)}
              className="bg-card border-line hover:border-gold text-foreground flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-semibold no-underline transition-colors"
            >
              <span className="bg-gold-tint text-gold-deep inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px]">
                {createElement(resolveIcon(area.icon), { className: "h-4 w-4", "aria-hidden": true })}
              </span>
              {createElement(nameAs, { className: "m-0 flex-1 text-sm font-semibold" }, area.name)}
              {local ? (
                <span className="bg-ink text-gold rounded-full px-[7px] py-0.5 text-[9.5px] font-bold tracking-[0.12em] uppercase">
                  Local
                </span>
              ) : null}
              <ArrowUpRight className="text-stone h-3.5 w-3.5 flex-none" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
