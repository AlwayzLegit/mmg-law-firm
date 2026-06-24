import Image from "next/image";

import { mediaUrl } from "@/lib/media";

import { SectionEyebrow } from "./section-eyebrow";

// Generic, non-attorney California courthouse scene — reinforces the
// litigation/"courtroom appearance" message without implying a specific
// person. (We do not present synthetic likenesses as the attorney.)
const IMG_PATH = mediaUrl("loc-courthouse.webp");

/**
 * Editorial "How we work" band — a paired image + copy block that sits
 * between the WhyMmg pillars and the AttorneyBioCard on the homepage.
 */
export function HowWeWork({ className }: { className?: string }) {
  return (
    <section
      className={
        "border-border/50 bg-secondary/30 relative border-y py-20 md:py-28 " +
        (className ?? "")
      }
    >
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/25"
            />
            <div className="border-border relative aspect-[4/3] w-full overflow-hidden rounded-2xl border">
              <Image
                src={IMG_PATH}
                alt="California courthouse where MMG Law Firm represents injured clients"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 560px, (min-width: 768px) 60vw, 100vw"
              />
            </div>
          </div>

          <div>
            <SectionEyebrow>How we work</SectionEyebrow>
            <h2 className="font-display mt-4 text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              You talk to the attorney directly. Every time.
            </h2>
            <p className="text-muted-foreground mt-5">
              No paralegal triage, no rotating case manager, no junior associate
              hand-off. The first call, the strategy decisions, the
              negotiations, and any courtroom appearance — Mihran handles your
              case end-to-end. That&apos;s the whole point of a solo
              plaintiff&apos;s firm.
            </p>
            <ul className="mt-7 grid gap-3 text-sm">
              <Bullet>Initial consultation is always with the attorney.</Bullet>
              <Bullet>
                He returns calls within one business hour during office hours.
              </Bullet>
              <Bullet>
                Bilingual representation in English, Armenian, and Russian.
              </Bullet>
              <Bullet>
                No fee unless we win — contingency from intake to recovery.
              </Bullet>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="mt-1.5 inline-block h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-gold-500)]"
      />
      <span className="text-foreground">{children}</span>
    </li>
  );
}
