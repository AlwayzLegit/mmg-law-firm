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
        "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em]",
        inverted ? "text-primary-foreground/80" : "text-primary",
        className,
      )}
    >
      <span
        className={cn(
          "block h-px w-8",
          inverted
            ? "bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-[var(--color-gold-500)]"
            : "bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-[var(--color-gold-500)]",
        )}
      />
      {children}
    </p>
  );
}
