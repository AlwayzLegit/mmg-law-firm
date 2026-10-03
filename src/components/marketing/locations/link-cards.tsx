import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

export type LinkCard = { href: string; label: string };

/**
 * White link cards used for city pin-cards, local practice-area pages,
 * siblings and nearby cities. `pin` adds the gold map-pin icon.
 */
export function LinkCards({
  items,
  pin = false,
  min = 240,
  className,
}: {
  items: LinkCard[];
  pin?: boolean;
  min?: number;
  className?: string;
}) {
  return (
    <ul
      className={cn("m-0 grid list-none gap-2.5 p-0", className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` }}
    >
      {items.map((it) => (
        <li key={it.href}>
          <Link
            href={it.href}
            className="group bg-card border-line hover:border-gold text-foreground flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-[14.5px] font-semibold no-underline transition-colors"
          >
            {pin ? <MapPin className="text-gold-deep h-[15px] w-[15px] flex-none" aria-hidden /> : null}
            <span className="flex-1">{it.label}</span>
            <ArrowRight className="text-stone group-hover:text-gold-deep h-3.5 w-3.5 flex-none transition-colors" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
