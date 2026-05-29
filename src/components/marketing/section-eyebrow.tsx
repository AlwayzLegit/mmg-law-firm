import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** When true, renders a light-on-dark variant for use on navy backgrounds. */
  inverted?: boolean;
};

/**
 * Distinctive section eyebrow: a short gold-fade rule + uppercase tracked
 * label. Used on every major section to establish a consistent visual
 * signature.
 */
export function SectionEyebrow({ children, className, inverted }: Props) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em]",
        inverted ? "text-primary-foreground/85" : "text-primary",
        className,
      )}
    >
      <span className="flex items-center gap-1.5" aria-hidden>
        <span
          className={cn(
            "block h-[2px] w-8 rounded-full",
            inverted
              ? "bg-gradient-to-r from-transparent to-[var(--color-gold-500)]"
              : "bg-gradient-to-r from-transparent to-[var(--color-gold-500)]",
          )}
        />
        <span className="block h-1.5 w-1.5 rounded-full bg-[var(--color-gold-500)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-gold-500)_18%,transparent)]" />
      </span>
      {children}
    </p>
  );
}
