import { cn } from "@/lib/utils";

/** Small bordered chip (hours, languages, years…). */
export function Pill({
  children,
  className,
  icon,
  tone = "outline",
}: {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "outline" | "card" | "gold";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs whitespace-nowrap",
        tone === "outline" && "border-line text-text-soft border",
        tone === "card" && "border-line-strong bg-card text-foreground border font-semibold tracking-[0.04em]",
        tone === "gold" && "bg-gold-tint text-eyebrow font-semibold tracking-[0.12em] uppercase text-[10px]",
        className,
      )}
    >
      {icon ? <span className="text-gold [&_svg]:size-3">{icon}</span> : null}
      {children}
    </span>
  );
}
