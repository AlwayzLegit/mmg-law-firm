import {
  HandCoins,
  ShieldCheck,
  MessageSquareHeart,
  Scale,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

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
      className={cn("border-y border-border bg-secondary/40", className)}
    >
      <div className="container-page py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Why MMG
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            How we work — and why it matters.
          </h2>
        </div>

        <ul className="mt-10 grid gap-8 md:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title} className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium tracking-tight">
                  {p.title}
                </h3>
                <p className="mt-2 text-muted-foreground">{p.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
