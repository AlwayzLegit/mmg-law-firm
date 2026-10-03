import Image from "next/image";
import {
  HandCoins,
  MessageSquareHeart,
  Minus,
  Plus,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { GlassCard } from "./primitives/glass-card";
import { Reveal } from "./primitives/reveal";

// Pillars mirror the live mmg-lawfirm.com hero — those three are the
// brand promises the firm has been making for years. The fourth is the
// firm's stated "client priority" positioning from its About page,
// written for the new site's solo-attorney framing.
//
// TODO(human): attorney review required — the design handoff proposes a
// tightened variant of these four bodies (same facts, fewer words). The
// verbatim v1 copy below stays as the indexed text until that review.
const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquareHeart,
    title: "Individualized attention",
    body: "Pursuing compensation after an accident is one of the most important things you'll do. As our client, you are our top priority — we'll go above and beyond as we fight for the compensation you need and deserve.",
  },
  {
    icon: ShieldCheck,
    title: "Respected attorney",
    body: "Mihran M. Ghazaryan is licensed by the State Bar of California and selected to Super Lawyers Rising Stars (2023–2026). The firm represents plaintiffs injured in truck, motorcycle, and car accidents and in slips and falls.",
  },
  {
    icon: HandCoins,
    title: "No fee unless we win",
    body: "Legal representation at MMG Law Firm is on a contingency-fee basis. The firm does not collect a fee unless it achieves a successful result on your case. The initial consultation is always free.",
  },
  {
    icon: Scale,
    title: "A real attorney handles your case",
    body: "MMG Law Firm is a plaintiff's personal-injury practice that handles a limited number of cases at a time, so each one gets the attention it deserves.",
  },
];

/**
 * Why MMG (redesign v2): ink section with the "working the file" photo in a
 * gold offset frame and a four-row native-<details> accordion. All bodies are
 * in the HTML; `name` makes the rows exclusive; the first is open by default.
 */
export function WhyMmg({ className }: { className?: string }) {
  return (
    <section className={cn("surface-ink bg-background text-foreground", className)}>
      <div className="container-page section-pad grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-center gap-12">
        <Reveal className="relative pr-[18px] pb-[18px]">
          <div aria-hidden className="border-gold absolute inset-0 top-[18px] left-[18px] rounded-2xl border" />
          <div className="bg-ink-soft relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src="/brand/working-the-file.webp"
              alt="Mihran M. Ghazaryan working a client file"
              fill
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
          </div>
          <GlassCard strength="strong" className="absolute bottom-[42px] left-6 rounded-xl px-4 py-3.5">
            <p className="text-gold m-0 text-[10px] tracking-[0.16em] uppercase">Solo plaintiff&apos;s firm</p>
            <p className="font-display text-cream m-0 mt-1 text-xl leading-[1.1] font-semibold">One attorney. Every case.</p>
          </GlassCard>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Why MMG</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-display text-cream mt-3.5 max-w-[18ch] font-semibold">
              Why injured Californians choose MMG.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-cream/70 mt-3.5 text-base">
              Solo practice means a real attorney handles every case. Bilingual.
              Direct. No layered handoffs.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <ul className="border-cream/12 m-0 mt-8 list-none border-t p-0">
              {POINTS.map((p, i) => (
                <li key={p.title} className="border-cream/12 border-b">
                  <details name="why-mmg" open={i === 0 || undefined} className="v2-details group">
                    <summary className="grid grid-cols-[44px_40px_1fr_20px] items-center gap-3.5 py-[18px] text-left max-sm:grid-cols-[32px_1fr_20px]">
                      <span className="font-display text-gold text-[26px] leading-none font-medium">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="bg-cream/7 text-gold inline-flex h-10 w-10 items-center justify-center rounded-[10px] max-sm:hidden">
                        <p.icon className="h-[18px] w-[18px]" aria-hidden />
                      </span>
                      <h3 className="font-display text-cream m-0 text-[22px] leading-[1.15] font-semibold tracking-[-0.01em]">
                        {p.title}
                      </h3>
                      <span aria-hidden className="text-cream/70 inline-flex justify-end">
                        <Plus className="details-plus h-4 w-4" />
                        <Minus className="details-minus h-4 w-4" />
                      </span>
                    </summary>
                    <p className="text-cream/74 m-0 pb-[22px] pl-[112px] text-[15.5px] leading-[1.65] max-sm:pl-[46px]">
                      {p.body}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
