import {
  HandCoins,
  MessageSquareHeart,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: HandCoins,
    title: "No fee unless we win",
    body: "Contingency representation across all matters. The consultation is free and the fee comes from the recovery — not your pocket.",
  },
  {
    icon: ShieldCheck,
    title: "Insurance know-how",
    body: "We know how California PI insurers think. We move quickly to lock in evidence and we don't let an adjuster's first offer set the conversation.",
  },
  {
    icon: MessageSquareHeart,
    title: "A real attorney handles your case",
    body: "Not a paralegal who passes you off. Mihran personally manages every matter, returns calls, and walks you through each decision.",
  },
  {
    icon: Scale,
    title: "Bilingual, plain-language counsel",
    body: "We translate the legal complexity into a clear plan and explain every option in the language that's most comfortable for you.",
  },
];

export function WhyMmg({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-y border-border bg-[var(--color-brand-900)] text-primary-foreground",
        className,
      )}
    >
      {/* gold accent rail */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />
      {/* faint grid in background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 100% 0%, color-mix(in oklab, var(--color-primary) 50%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="container-page py-20 md:py-24">
        <div className="max-w-2xl">
          <SectionEyebrow inverted>Why MMG</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            How we work — and why it matters.
          </h2>
          <p className="mt-4 text-primary-foreground/75">
            Solo practice means a real attorney handles every case. Bilingual.
            Direct. No layered handoffs.
          </p>
        </div>

        <ul className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {POINTS.map((p, i) => (
            <li key={p.title} className="flex items-start gap-5">
              <span
                aria-hidden
                className="select-none font-display text-3xl font-medium tracking-tight text-[var(--color-gold-500)]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary-foreground/10 text-primary-foreground ring-1 ring-inset ring-primary-foreground/20">
                    <p.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="font-display text-lg font-medium tracking-tight">
                    {p.title}
                  </h3>
                </div>
                <p className="mt-3 text-primary-foreground/80">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
