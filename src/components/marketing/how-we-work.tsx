import Image from "next/image";
import { Clock, Languages, ShieldCheck, User, type LucideIcon } from "lucide-react";

import { COMMON_PROCESS } from "@/lib/data/practice-area-content";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { IconTile } from "./primitives/icon-tile";
import { Reveal } from "./primitives/reveal";
import { ProcessStepper } from "./process-stepper";

// Generic, non-attorney California courthouse scene — reinforces the
// litigation/"courtroom appearance" message without implying a specific
// person. (We do not present synthetic likenesses as the attorney.)
const IMG_PATH = mediaUrl("loc-courthouse.webp");

const BULLETS: { icon: LucideIcon; text: string }[] = [
  { icon: User, text: "Initial consultation is always with the attorney." },
  { icon: Clock, text: "He returns calls within one business hour during office hours." },
  { icon: Languages, text: "Bilingual representation in English, Armenian, and Russian." },
  { icon: ShieldCheck, text: "No fee unless we win — contingency from intake to recovery." },
];

/**
 * "How we work" (redesign v2): copy + four bullet cards, then a white card
 * with the four-step process stepper and the courthouse photo.
 */
export function HowWeWork({ className }: { className?: string }) {
  return (
    <section className={cn("bg-background text-foreground", className)}>
      <div className="container-page section-pad">
        <Reveal className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-center gap-10">
          <div>
            <Eyebrow>How we work</Eyebrow>
            <h2 className="text-display mt-3.5 max-w-[16ch] font-semibold">
              You talk to the attorney directly. <em className="em-gold">Every time.</em>
            </h2>
            <p className="text-stone mt-4 text-base">
              No paralegal triage, no rotating case manager, no junior associate
              hand-off. The first call, the strategy decisions, the
              negotiations, and any courtroom appearance — Mihran handles your
              case end-to-end. That&apos;s the whole point of a solo
              plaintiff&apos;s firm.
            </p>
          </div>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3 p-0">
            {BULLETS.map((b) => (
              <li key={b.text} className="bg-card border-line flex items-start gap-3.5 rounded-[14px] border p-[18px]">
                <IconTile size="md" tone="gold">
                  <b.icon aria-hidden />
                </IconTile>
                <span className="text-[14.5px] leading-[1.5]">{b.text}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          delay={80}
          className="bg-card border-line mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] overflow-hidden rounded-[18px] border"
        >
          <ProcessStepper steps={COMMON_PROCESS} />
          <div className="bg-ink-soft relative min-h-[380px]">
            <Image
              src={IMG_PATH}
              alt="California courthouse where MMG Law Firm represents injured clients"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 560px, 100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,17,21,.55),rgba(15,17,21,0)_60%)]" />
            {/* TODO(human): attorney review required — caption drafted for the redesign. */}
            <p className="font-display text-cream absolute bottom-[22px] left-6 m-0 max-w-[30ch] text-[15px] leading-[1.4] font-medium italic">
              Most matters settle. We prepare every one as if it will be tried — that is what moves the number.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
