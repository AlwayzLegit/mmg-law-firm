import { cn } from "@/lib/utils";

type Surface = "paper" | "paper-2" | "ink";

/**
 * Section wrapper that sets the colour surface and the standard padding
 * rhythm. `surface="ink"` flips every semantic token for its descendants.
 */
export function Section({
  surface = "paper",
  children,
  className,
  innerClassName,
  id,
  padding = "default",
  hairline = false,
  ariaLabel,
  ariaLabelledby,
}: {
  surface?: Surface;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
  padding?: "default" | "sm" | "none";
  /** Thin top border in the surface's line colour. */
  hairline?: boolean;
  ariaLabel?: string;
  ariaLabelledby?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      className={cn(
        "bg-background text-foreground relative",
        surface === "ink" && "surface-ink",
        surface === "paper-2" && "surface-paper-2",
        hairline && "border-line border-t",
        className,
      )}
    >
      <div
        className={cn(
          "container-page",
          padding === "default" && "section-pad",
          padding === "sm" && "section-pad-sm",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
