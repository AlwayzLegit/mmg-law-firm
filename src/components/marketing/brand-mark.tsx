import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** When true, the wordmark sits beside the glyph; when false, glyph only. */
  withWordmark?: boolean;
  /** Use light text + warmer roundel on dark backgrounds (e.g., footer). */
  inverted?: boolean;
};

/**
 * MMG Law Firm brand mark. Stylized "MMG" stacked-monogram glyph in a navy
 * roundel with a warm gold underline — meant to read as a confident, slightly
 * traditional, plate-style attorney mark without being twee about it.
 */
export function BrandMark({
  className,
  withWordmark = true,
  inverted = false,
}: Props) {
  return (
    <span
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="MMG Law Firm"
    >
      <svg
        viewBox="0 0 40 40"
        width="32"
        height="32"
        aria-hidden
        className="block"
      >
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="9"
          fill="var(--color-brand-700, #18298c)"
        />
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="9"
          fill="url(#mmg-grad)"
          opacity="0.9"
        />
        <defs>
          <linearGradient id="mmg-grad" x1="0" y1="0" x2="40" y2="40">
            <stop offset="0%" stopColor="#2b46d8" />
            <stop offset="100%" stopColor="#18298c" />
          </linearGradient>
        </defs>
        {/* MMG monogram — geometric serif strokes drawn as filled paths */}
        <path
          d="M9.2 28V12.8h2.6l4.5 8.6 4.5-8.6h2.6V28h-2.4V17.6l-3.7 7h-2l-3.7-7V28H9.2zm17.4 0V12.8h2.6l4.5 8.6.6-1.1h2.5V28h-2.4v-7.5L31.4 24h-2l-1-1.9V28h-1.8z"
          fill="#ffffff"
          opacity="0.95"
        />
        {/* warm gold underline accent */}
        <rect
          x="9"
          y="30"
          width="22"
          height="1.6"
          rx="0.8"
          fill="var(--color-gold-500, #c9a35a)"
        />
      </svg>
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
