import Image from "next/image";

import { publicAssetExists } from "@/lib/brand-assets";

import { SectionEyebrow } from "./section-eyebrow";

const IMG_PATH = "/brand/attorney-portrait.webp";

type Props = {
  attorneyName: string;
  /** Optional short quote / tagline that overlays the portrait. */
  tagline?: string;
};

/**
 * Editorial full-bleed library portrait, used on the attorney bio page
 * below the credential band. Returns null when the brand image hasn't
 * been committed yet — the bio page reads cleanly without it.
 */
export function AttorneyEditorial({ attorneyName, tagline }: Props) {
  if (!publicAssetExists(IMG_PATH)) return null;

  return (
    <section className="relative isolate overflow-hidden border-y border-border bg-secondary/20">
      <div className="container-page py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:gap-16">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/25"
            />
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border">
              <Image
                src={IMG_PATH}
                alt={`${attorneyName} in chambers`}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 480px, (min-width: 768px) 60vw, 100vw"
              />
            </div>
          </div>

          <div>
            <SectionEyebrow>In chambers</SectionEyebrow>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {tagline ?? "Plaintiff-side litigation, on your terms."}
            </h2>
            <p className="mt-5 text-muted-foreground">
              Personal injury is a fight, and the insurance carriers on the
              other side know it. A solo practice means the attorney who
              answers your first call is the same attorney making
              settlement demands, taking depositions, and arguing your
              motions. The case never leaves his hands.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
