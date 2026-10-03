import { cn } from "@/lib/utils";

/** Translucent card for use over photos on ink sections. */
export function GlassCard({
  children,
  className,
  strength = "default",
}: {
  children: React.ReactNode;
  className?: string;
  strength?: "default" | "strong";
}) {
  return (
    <div
      className={cn(
        "border-cream/12 rounded-[14px] border backdrop-blur-md",
        strength === "default" ? "bg-ink/60" : "bg-ink/75",
        className,
      )}
    >
      {children}
    </div>
  );
}
