import {
  HandCoins,
  MessageSquareHeart,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

// Pillars mirror the live mmg-lawfirm.com hero — those three are the
// brand promises the firm has been making for years. The fourth is the
// firm's stated "client priority" positioning from its About page,
// written for the new site's solo-attorney framing.
const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquareHeart,
    title: "Individualized attention",
    body: "Pursuing compensation after an accident is one of the most important things you'll do. As our client, you are our top priority — we'll go above and beyond as we fight for the compensation you need and deserve.",
  },
  {
    icon: ShieldCheck,
    title: "Respected attorney",
    body: "Mihran M. Ghazaryan is licensed to practice in California state and federal courts. The firm has built its reputation representing plaintiffs injured in truck, motorcycle, and car accidents and in slips and falls.",
  },
  {
    icon: HandCoins,
    title: "No fee unless we win",
    body: "Legal representation at MMG Law Firm is on a contingency-fee basis. The firm does not collect a fee unless it achieves a successful result on your case. The initial consultation is always free.",
  },
  {
    icon: Scale,
    title: "A real attorney handles your case",
    body: "MMG Law Firm is a premier civil-litigation firm dedicated to representing plaintiffs, handling a limited number of cases at a time so each one gets the attention it deserves.",
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

      <div className="container-page py-20 md:py-28">
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

        <ul className="mt-14 grid gap-x-12 gap-y-12 md:grid-cols-2">
          {POINTS.map((p, i) => (
            <li
              key={p.title}
              className="relative flex items-start gap-6 border-l border-primary-foreground/15 pl-6"
            >
              <span
                aria-hidden
                className="select-none font-display text-5xl font-medium leading-none tracking-tight text-[var(--color-gold-500)] md:text-6xl"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground ring-1 ring-inset ring-primary-foreground/20">
                    <p.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="font-display text-lg font-medium tracking-tight md:text-xl">
                    {p.title}
                  </h3>
                </div>
                <p className="mt-3 text-primary-foreground/85">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
