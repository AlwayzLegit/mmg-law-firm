import {
  Banknote,
  BriefcaseMedical,
  Car,
  HeartPulse,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

import { SectionEyebrow } from "./section-eyebrow";

// TODO(human): attorney review required — standard CA damages categories,
// AI-drafted. Verify the framing before long-term use.
const CATEGORIES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BriefcaseMedical,
    title: "Medical expenses",
    body: "Emergency care, hospitalization, surgery, rehabilitation, and the future treatment your providers say you'll need.",
  },
  {
    icon: Banknote,
    title: "Lost wages",
    body: "Income you lost while recovering — and, where the injury affects your ability to work, diminished future earning capacity.",
  },
  {
    icon: HeartPulse,
    title: "Pain and suffering",
    body: "Compensation for physical pain, emotional distress, and the ways the injury has changed how you live day to day.",
  },
  {
    icon: Car,
    title: "Property damage",
    body: "Repair or replacement of your vehicle and other property damaged in the incident.",
  },
  {
    icon: TrendingDown,
    title: "Out-of-pocket costs",
    body: "Transportation to appointments, medical equipment, household help, and the other expenses an injury forces on you.",
  },
];

type Props = {
  /** e.g. "car accident" — used to make the heading practice-aware. */
  nounSingular?: string;
};

/**
 * "What compensation can cover" — standard California damages categories,
 * rendered as a card grid. Used on city × practice landing pages. The copy
 * deliberately avoids guarantee language: categories describe what a claim
 * can seek, never what a client will get.
 */
export function CompensationSection({ nounSingular }: Props) {
  return (
    <section className="mt-12">
      <SectionEyebrow>Damages</SectionEyebrow>
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
        What compensation can cover
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every {nounSingular ?? "injury"} claim is different, but California law
        allows injured plaintiffs to seek several categories of damages. We
        build each one with documentation — medical records, wage statements,
        expert opinions — so nothing is left on the table.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c) => (
          <div
            key={c.title}
            className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
          >
            <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className="font-display text-base font-medium tracking-tight">
                {c.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {c.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
