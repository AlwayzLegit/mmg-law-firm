import { cn } from "@/lib/utils";

/** Rounded square tile with a gold icon — the recurring icon treatment. */
export function IconTile({
  children,
  size = "md",
  tone = "gold",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** gold = gold tint bg + gold-deep/gold icon; soft = surface tile bg. */
  tone?: "gold" | "soft" | "solid";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center",
        size === "sm" && "h-8 w-8 rounded-lg [&_svg]:size-4",
        size === "md" && "h-10 w-10 rounded-[10px] [&_svg]:size-[18px]",
        size === "lg" && "h-11 w-11 rounded-xl [&_svg]:size-5",
        size === "xl" && "h-14 w-14 rounded-[14px] [&_svg]:size-[26px]",
        tone === "gold" && "bg-gold-tint text-eyebrow",
        tone === "soft" && "bg-tile text-eyebrow",
        tone === "solid" && "bg-gold text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
