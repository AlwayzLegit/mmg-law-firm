import { cn } from "@/lib/utils";

/**
 * Section eyebrow: 24×1px gold rule + 12px/600 uppercase label. Colour comes
 * from the surface (`--eyebrow`: gold-deep on paper, gold on ink), so the same
 * component works in both.
 */
export function Eyebrow({
  children,
  className,
  as: Tag = "p",
  centered = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "p" | "span" | "div";
  centered?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "text-eyebrow inline-flex items-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase",
        className,
      )}
    >
      <span aria-hidden className="bg-gold block h-px w-6" />
      {children}
      {centered ? <span aria-hidden className="bg-gold block h-px w-6" /> : null}
    </Tag>
  );
}
