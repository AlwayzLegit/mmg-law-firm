import { getImageProps } from "next/image";

/** Phones (below the md breakpoint) get the lighter hero; see v3.css. */
export const MOBILE_HERO_MEDIA = "(max-width: 767px)";
export const DESKTOP_HERO_MEDIA = "(min-width: 768px)";

/**
 * The 1200px AVIF of a hero, for phones. The density candidates sized for
 * desktop resolve past the original's width on a phone, so the optimizer
 * hands back the full original file (93–122 KB); this is roughly half that.
 * Set as `--hero-mobile` on the section, and v3.css swaps it in below md.
 */
export function mobileHeroUrl(src: string, width: number, height: number): string {
  const ratio = height / width;
  const { props } = getImageProps({ src, alt: "", width: 1200, height: Math.round(1200 * ratio), quality: 65 });
  return props.srcSet!.split(", ")[0].split(" ")[0];
}
