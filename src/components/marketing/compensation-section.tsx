import {
  Banknote,
  BriefcaseMedical,
  Car,
  Gavel,
  HeartPulse,
  Scale,
  TrendingDown,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import { SectionEyebrow } from "./section-eyebrow";

// TODO(human): attorney review required — standard CA damages categories,
// AI-drafted. Verify the framing before long-term use.
const INJURY_CATEGORIES: { icon: LucideIcon; title: string; body: string }[] = [
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

// TODO(human): attorney review required — California employment (FEHA / Labor
// Code) remedy categories, AI-drafted. Verify the framing before long-term use.
const EMPLOYMENT_CATEGORIES: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: Banknote,
    title: "Back pay and lost benefits",
    body: "Wages, commissions, and benefits you lost from the date of the wrongful act — a core remedy in wrongful-termination and discrimination claims.",
  },
  {
    icon: TrendingDown,
    title: "Front pay",
    body: "Future earnings you're likely to lose when reinstatement isn't realistic, measured until you can reasonably be expected to find comparable work.",
  },
  {
    icon: HeartPulse,
    title: "Emotional distress",
    body: "Compensation for the anxiety, humiliation, and harm to wellbeing that unlawful treatment at work can cause.",
  },
  {
    icon: Gavel,
    title: "Penalties and punitive damages",
    body: "Statutory penalties for wage violations, and — where an employer acted with malice or oppression — punitive damages meant to deter the conduct.",
  },
  {
    icon: Scale,
    title: "Attorney's fees and costs",
    body: "Many California employment statutes shift the employee's reasonable attorney's fees and costs onto an employer that broke the law.",
  },
  {
    icon: Undo2,
    title: "Reinstatement and policy change",
    body: "Where it fits the case, getting your job back or forcing the employer to correct the practice that harmed you.",
  },
];

type Props = {
  /** e.g. "car accident" — used to make the heading practice-aware. */
  nounSingular?: string;
  /** Practice family. "employment" swaps PI damages for FEHA/Labor Code
   *  remedies. Undefined ⇒ injury. */
  category?: "injury" | "employment";
};

/**
 * "What compensation can cover" — California damages/remedy categories,
 * rendered as a card grid. Used on city × practice landing pages. The copy
 * deliberately avoids guarantee language: categories describe what a claim
 * can seek, never what a client will get. The category controls whether the
 * personal-injury or employment-law remedy set is shown.
 */
export function CompensationSection({ nounSingular, category }: Props) {
  const isEmployment = category === "employment";
  const categories = isEmployment ? EMPLOYMENT_CATEGORIES : INJURY_CATEGORIES;
  return (
    <section className="mt-12">
      <SectionEyebrow>{isEmployment ? "Remedies" : "Damages"}</SectionEyebrow>
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
        {isEmployment ? "What you may be able to recover" : "What compensation can cover"}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {isEmployment ? (
          <>
            Every {nounSingular ?? "employment"} case is different, but
            California law lets wronged employees pursue several categories of
            relief. We document each one — pay records, performance reviews,
            communications — so nothing is left on the table.
          </>
        ) : (
          <>
            Every {nounSingular ?? "injury"} claim is different, but California
            law allows injured plaintiffs to seek several categories of damages.
            We build each one with documentation — medical records, wage
            statements, expert opinions — so nothing is left on the table.
          </>
        )}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
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
