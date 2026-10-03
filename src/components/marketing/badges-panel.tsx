import Image from "next/image";

import type { FirmBadge } from "@/lib/data/firm-settings";
import { mediaUrl } from "@/lib/media";

import { Reveal } from "./primitives/reveal";

/**
 * "Badges & press" logo strip. Renders only when the owner has added
 * entries in firm_settings.badges_json — never a placeholder frame publicly.
 */
export function BadgesPanel({ badges, className }: { badges: FirmBadge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <Reveal delay={160} className={className}>
      <div className="bg-card border-line rounded-[18px] border p-6">
        <p className="micro-label text-stone m-0 tracking-[0.16em]">Badges &amp; press</p>
        <ul className="m-0 mt-4 grid list-none grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 p-0">
          {badges.map((b) => {
            const src = b.src.startsWith("http") || b.src.startsWith("/") ? b.src : mediaUrl(b.src);
            const img = (
              <span className="relative block h-[72px] w-full">
                <Image src={src} alt={b.alt} fill sizes="200px" className="object-contain" />
              </span>
            );
            return (
              <li key={b.src} className="bg-paper rounded-[10px] p-2">
                {b.href ? (
                  <a href={b.href} target="_blank" rel="noopener" aria-label={b.alt} className="block">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Reveal>
  );
}
