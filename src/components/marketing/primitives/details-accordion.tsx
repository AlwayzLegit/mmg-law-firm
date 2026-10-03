import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Accordion built on native <details>/<summary>: every answer is in the HTML
 * (SEO parity), keyboard accessible with zero JS, and `name` gives exclusive
 * open behaviour in modern browsers. Visuals follow the design: white card,
 * Newsreader question, round plus/minus toggle.
 */
export type DetailsItem = { id?: string; title: React.ReactNode; body: React.ReactNode };

export function DetailsAccordion({
  items,
  name,
  defaultOpen = 0,
  variant = "cards",
  className,
}: {
  items: DetailsItem[];
  /** Shared name → only one open at a time. */
  name: string;
  defaultOpen?: number | null;
  variant?: "cards" | "rows";
  className?: string;
}) {
  return (
    <div className={cn(variant === "cards" ? "grid gap-2.5" : "border-line border-t", className)}>
      {items.map((it, i) => (
        <details
          key={it.id ?? i}
          name={name}
          open={defaultOpen === i || undefined}
          className={cn(
            "v2-details group",
            variant === "cards" && "bg-card border-line overflow-hidden rounded-[14px] border",
            variant === "rows" && "border-line border-b",
          )}
        >
          <summary
            className={cn(
              "flex w-full items-center justify-between gap-5 text-left",
              variant === "cards" && "px-[22px] py-[18px]",
              variant === "rows" && "py-[18px]",
            )}
          >
            <span className="font-display text-foreground text-lg leading-[1.3] font-semibold tracking-[-0.01em]">
              {it.title}
            </span>
            <span
              aria-hidden
              className="bg-foreground/6 text-foreground group-open:bg-foreground group-open:text-background inline-flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full transition-colors"
            >
              <Plus className="details-plus h-3.5 w-3.5" />
              <Minus className="details-minus h-3.5 w-3.5" />
            </span>
          </summary>
          <div
            className={cn(
              "text-text-soft text-[15px] leading-[1.65]",
              variant === "cards" && "px-[22px] pr-[60px] pb-5",
              variant === "rows" && "pb-[22px]",
            )}
          >
            {it.body}
          </div>
        </details>
      ))}
    </div>
  );
}
