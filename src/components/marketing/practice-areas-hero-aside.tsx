import Image from "next/image";

import { mediaUrl } from "@/lib/media";

export const PRACTICE_AREAS_HERO_IMG = mediaUrl("loc-scales-of-justice.webp");

export function practiceAreasHeroImageExists(): boolean {
  // The aside image now lives in the media bucket and always exists.
  return true;
}

/**
 * Aside slot for the practice-areas index PageHero — a close-up
 * "working the file" visual. Renders the image directly; the page is
 * responsible for not passing this in when the brand image isn't yet
 * committed (use {@link practiceAreasHeroImageExists}).
 */
export function PracticeAreasHeroAside() {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/25"
      />
      <div className="border-border relative aspect-[5/4] w-full overflow-hidden rounded-2xl border">
        <Image
          src={PRACTICE_AREAS_HERO_IMG}
          alt="Scales of justice — California personal-injury representation"
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 480px, 100vw"
          quality={65}
          priority
        />
      </div>
    </div>
  );
}
