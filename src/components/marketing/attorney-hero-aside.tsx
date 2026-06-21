import Image from "next/image";

import { mediaUrl } from "@/lib/media";

/**
 * Gold-plate framed attorney portrait for inner-page heroes (matches the
 * homepage hero card and practice-areas aside). Served through next/image so
 * Vercel resizes + re-encodes to AVIF/WebP.
 */
export function AttorneyHeroAside({
  image,
  alt,
  priority = false,
}: {
  image: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/25"
      />
      <div className="border-border relative aspect-[4/5] w-full overflow-hidden rounded-2xl border">
        <Image
          src={mediaUrl(image)}
          alt={alt}
          fill
          className="object-cover object-top"
          sizes="(min-width: 1024px) 420px, 100vw"
          quality={65}
          priority={priority}
        />
      </div>
    </div>
  );
}
