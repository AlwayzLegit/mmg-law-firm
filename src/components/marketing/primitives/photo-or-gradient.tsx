import Image from "next/image";
import { createElement } from "react";

import { PRACTICE_AREA_IMAGE, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { resolveIcon } from "./resolve-icon";

export { resolveIcon };

/**
 * Practice-area visual: the `pa-<slug>.webp` photo when one exists, otherwise
 * the design's gradient panel with a large faded icon and a numeral watermark.
 * Fills its (relative, sized) parent.
 */
export function PhotoOrGradient({
  slug,
  icon,
  alt,
  number,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  className,
  imgClassName,
  loading,
}: {
  slug: string;
  icon: string;
  alt: string;
  number?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  loading?: "lazy" | "eager";
}) {
  const img = PRACTICE_AREA_IMAGE[slug];
  if (img) {
    return (
      <Image
        src={mediaUrl(img)}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : loading}
        className={cn("object-cover", imgClassName)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn("bg-ink-panel absolute inset-0 flex items-center justify-center overflow-hidden", className)}
    >
      {createElement(resolveIcon(icon), {
        className: "text-gold h-auto w-[44%] max-w-[210px] opacity-30",
        strokeWidth: 1.25,
      })}
      {number ? (
        <span className="font-display text-cream/5 absolute right-4 -bottom-3.5 text-[170px] leading-none font-semibold tracking-[-0.05em]">
          {number}
        </span>
      ) : null}
    </div>
  );
}
