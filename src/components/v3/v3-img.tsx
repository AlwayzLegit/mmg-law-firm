import Image from "next/image";
import type { CSSProperties } from "react";

import { V3_ASSETS } from "./v3-assets";

type Props = {
  /** Design-relative path (e.g. "uploads/icons/lock.svg") or absolute URL. */
  src: string;
  alt: string;
  style?: CSSProperties;
  className?: string;
  priority?: boolean;
  fetchPriority?: "high" | "low" | "auto";
  loading?: "eager" | "lazy";
  sizes?: string;
  [key: `data-${string}`]: string | undefined;
};

/**
 * Image from the v3 design handoff. Raster art is served through next/image
 * (optimized, responsive srcset); SVG icons skip optimization. Intrinsic
 * dimensions come from the generated asset map so layout never shifts.
 */
export function V3Img({ src, alt, style, className, priority, sizes, ...rest }: Props) {
  const asset = V3_ASSETS[src];
  if (!asset) {
    // Unknown/remote asset — render nothing rather than a broken image.
    return null;
  }
  const isSvg = asset.src.endsWith(".svg");
  return (
    <Image
      src={decodeURI(asset.src)}
      width={asset.w || 64}
      height={asset.h || 64}
      alt={alt}
      style={style}
      className={className}
      unoptimized={isSvg}
      priority={priority}
      sizes={sizes ?? (isSvg ? undefined : "(max-width: 768px) 100vw, 60vw")}
      {...rest}
    />
  );
}
