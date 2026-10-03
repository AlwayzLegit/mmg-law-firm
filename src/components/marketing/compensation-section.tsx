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

import { Eyebrow } from "./primitives/eyebrow";
import { IconTile } from "./primitives/icon-tile";

// TODO(human): attorney review required — standard CA damages categories,
// AI-drafted. Verify the framing before long-term use.
export const INJURY_CATEGORIES: { icon: LucideIcon; title: string; body: string }[] = [
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
  id?: string;
};

/**
 * "What compensation can cover" — California damages/remedy categories,
 * rendered as white tiles. Used on practice hubs and city × practice pages.
 * The copy deliberately avoids guarantee language: categories describe what
 * a claim can seek, never what a client will get. The category controls
 * whether the personal-injury or employment-law remedy set is shown.
 */
export function CompensationSection({ nounSingular, category, id }: Props) {
  const isEmployment = category === "employment";
  const categories = isEmployment ? EMPLOYMENT_CATEGORIES : INJURY_CATEGORIES;
  return (
    <section id={id} className="mt-14 scroll-mt-[130px]">
      <Eyebrow>{isEmployment ? "Remedies" : "Damages"}</Eyebrow>
      <h2 className="text-display-sm mt-3 font-semibold">
        {isEmployment ? "What you may be able to recover" : "What compensation can cover"}
      </h2>
      <p className="text-stone mt-3 max-w-[62ch] text-[15.5px]">
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
      <ul className="m-0 mt-6 grid list-none grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5 p-0">
        {categories.map((c) => (
          <li key={c.title} className="bg-card border-line hover:border-gold rounded-[14px] border px-4 py-[18px] transition-colors">
            <IconTile size="md" tone="gold">
              <c.icon aria-hidden />
            </IconTile>
            <h3 className="font-display mt-3 text-lg leading-[1.15] font-semibold tracking-[-0.01em]">{c.title}</h3>
            <p className="text-stone mt-1.5 text-[13px] leading-[1.5]">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
