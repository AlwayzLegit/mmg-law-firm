import Image from "next/image";

import { mediaUrl } from "@/lib/media";

/**
 * Landscape illustrative image band for content pages (e.g. the subject photo
 * on a practice-area page). Served through next/image so Vercel resizes +
 * re-encodes to AVIF/WebP.
 */
export function SubjectImage({
  image,
  alt,
  className = "",
}: {
  image: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`border-border relative aspect-[16/9] w-full overflow-hidden rounded-2xl border ${className}`}
    >
      <Image
        src={mediaUrl(image)}
        alt={alt}
        fill
        className="object-cover"
        sizes="(min-width: 1024px) 640px, 100vw"
        quality={70}
      />
    </div>
  );
}
