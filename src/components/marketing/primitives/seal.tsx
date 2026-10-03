import { Award } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Super Lawyers "Rising Stars" seal. `variant="hero"` is the small rotated
 * badge pinned to hero corners; `variant="medallion"` is the 240px version in
 * the Recognition section. Facts come from the caller — nothing is invented.
 */
export function Seal({
  years,
  variant = "hero",
  className,
}: {
  years: string;
  variant?: "hero" | "medallion";
  className?: string;
}) {
  if (variant === "medallion") {
    return (
      <div
        aria-hidden
        className={cn(
          "bg-seal relative flex h-60 w-60 items-center justify-center rounded-full shadow-[0_30px_60px_-30px_rgba(138,109,47,.7),inset_0_0_0_1px_rgba(255,255,255,.4)]",
          className,
        )}
      >
        <div className="text-ink flex h-[196px] w-[196px] flex-col items-center justify-center rounded-full border border-ink/35 text-center">
          <Award className="h-[26px] w-[26px]" />
          <p className="mt-2 text-[10px] font-bold tracking-[0.22em] uppercase">Super Lawyers</p>
          <p className="font-display mt-0.5 text-3xl leading-none font-semibold tracking-[-0.02em]">Rising Stars</p>
          <p className="mt-2 text-[11px] font-semibold tracking-[0.14em]">{years}</p>
          <p className="text-ink/65 mt-1.5 text-[9.5px] tracking-[0.16em] uppercase">California</p>
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "bg-seal shadow-seal flex h-[clamp(88px,10vw,128px)] w-[clamp(88px,10vw,128px)] -rotate-[8deg] items-center justify-center rounded-full",
        className,
      )}
    >
      <div className="text-ink flex h-[82%] w-[82%] flex-col items-center justify-center rounded-full border border-ink/35 text-center">
        <p className="text-[8px] font-bold tracking-[0.18em] uppercase">Super Lawyers</p>
        <p className="font-display mt-0.5 text-[17px] leading-none font-semibold tracking-[-0.02em]">Rising Stars</p>
        <p className="mt-1 text-[8.5px] font-semibold tracking-[0.1em]">{years}</p>
      </div>
    </div>
  );
}
