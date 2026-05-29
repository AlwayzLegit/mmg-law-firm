import Image from "next/image";

import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** When true, the wordmark sits beside the glyph; when false, glyph only. */
  withWordmark?: boolean;
  /** Use light text + warmer roundel on dark backgrounds (e.g., footer). */
  inverted?: boolean;
};

/**
 * MMG Law Firm brand mark. Uses the firm's actual published logo — three
 * gold columns spelling MMG — sourced from mmg-lawfirm.com. The image has
 * a transparent background, so it sits cleanly on both light and dark
 * surfaces; the inverted prop only flips the accompanying wordmark.
 */
export function BrandMark({
  className,
  withWordmark = true,
  inverted = false,
}: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/mmg-logo.png"
        alt={withWordmark ? "" : "MMG Law Firm"}
        width={36}
        height={36}
        priority
        className="block h-9 w-9 select-none"
      />
      {withWordmark ? (
        <span className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-lg font-semibold tracking-tight sm:text-xl",
              inverted ? "text-primary-foreground" : "text-foreground",
            )}
          >
            MMG
          </span>
          <span
            className={cn(
              "font-display text-sm font-medium tracking-wide sm:text-base",
              inverted
                ? "text-primary-foreground/70"
                : "text-muted-foreground",
            )}
          >
            Law Firm
          </span>
        </span>
      ) : null}
    </span>
  );
}
