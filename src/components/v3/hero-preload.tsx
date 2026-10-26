import { DESKTOP_HERO_MEDIA, MOBILE_HERO_MEDIA } from "./mobile-hero";

/**
 * Preload the LCP hero image as rendered <link> elements (React 19 hoists
 * them into <head>). Not ReactDOM.preload(): those hints ride along in the
 * RSC payload when Next prefetches a route, so every page that links to
 * the home page was fetching its background at high priority, competing
 * with its own hero. A <link> only takes effect when the page renders.
 */
export function HeroPreload({ hero }: { hero: { src: string; srcSet?: string; mobileSrc: string } }) {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={hero.src}
        imageSrcSet={hero.srcSet}
        media={DESKTOP_HERO_MEDIA}
        fetchPriority="high"
      />
      <link rel="preload" as="image" href={hero.mobileSrc} media={MOBILE_HERO_MEDIA} fetchPriority="high" />
    </>
  );
}

/** Single-image variant (the home page background). */
export function ImagePreload({ href }: { href: string }) {
  return <link rel="preload" as="image" href={href} fetchPriority="high" />;
}
