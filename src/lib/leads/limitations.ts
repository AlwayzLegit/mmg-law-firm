/**
 * Statute-of-limitations estimates for intake triage.
 *
 * These are the headline California deadlines a personal-injury /
 * employment intake desk works from. They are estimates for prioritising
 * follow-up, not legal advice: tolling, discovery rules, minors, and claim
 * presentation requirements change the real date. The attorney confirms the
 * operative deadline on every matter.
 *
 * TODO(human): attorney review required — confirm the rules below and add
 * any practice-specific ones the firm relies on.
 */

export type LimitationRule = {
  key: string;
  label: string;
  /** Months from the incident date. */
  months: number;
  /** Short citation shown in the UI. */
  authority: string;
};

/** Default rule for bodily injury and wrongful death: 2 years. */
export const PERSONAL_INJURY: LimitationRule = {
  key: "personal-injury",
  label: "Personal injury / wrongful death",
  months: 24,
  authority: "Cal. Code Civ. Proc. § 335.1",
};

/** Claims against a public entity must be presented first: 6 months. */
export const GOVERNMENT_CLAIM: LimitationRule = {
  key: "government-claim",
  label: "Government claim (public entity defendant)",
  months: 6,
  authority: "Cal. Gov. Code § 911.2",
};

/** FEHA employment claims: 3 years to file with the Civil Rights Department. */
export const FEHA_EMPLOYMENT: LimitationRule = {
  key: "feha",
  label: "Employment (FEHA complaint to CRD)",
  months: 36,
  authority: "Cal. Gov. Code § 12960(e)",
};

/** Wage claims: 3 years for most statutory wage violations. */
export const WAGE_CLAIM: LimitationRule = {
  key: "wage",
  label: "Wage and hour",
  months: 36,
  authority: "Cal. Code Civ. Proc. § 338(a)",
};

const EMPLOYMENT_SLUGS = new Set([
  "employment-law",
  "sexual-harassment",
  "workplace-discrimination",
  "wrongful-termination",
]);

/** Pick the rule for a practice-area slug; unknown/empty → personal injury. */
export function ruleForPracticeArea(
  slug: string | null | undefined,
  opts: { governmentEntity?: boolean } = {},
): LimitationRule {
  if (opts.governmentEntity) return GOVERNMENT_CLAIM;
  if (!slug) return PERSONAL_INJURY;
  if (slug === "wage-and-hour") return WAGE_CLAIM;
  if (EMPLOYMENT_SLUGS.has(slug)) return FEHA_EMPLOYMENT;
  return PERSONAL_INJURY;
}

/** Add calendar months to an ISO date (YYYY-MM-DD), clamping to month end. */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export type Deadline = {
  rule: LimitationRule;
  /** YYYY-MM-DD */
  date: string;
  daysLeft: number;
  tone: "ok" | "warn" | "urgent" | "passed";
};

/**
 * Deadline for a lead from its incident date. `now` is an epoch ms for
 * testability; tone thresholds: < 0 passed, ≤ 60 days urgent, ≤ 180 warn.
 */
export function deadlineFor(
  incidentDate: string | null | undefined,
  rule: LimitationRule,
  now = Date.now(),
): Deadline | null {
  if (!incidentDate || !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) return null;
  const date = addMonths(incidentDate, rule.months);
  const daysLeft = Math.floor(
    (Date.parse(date + "T00:00:00Z") - now) / 86_400_000,
  );
  const tone =
    daysLeft < 0
      ? "passed"
      : daysLeft <= 60
        ? "urgent"
        : daysLeft <= 180
          ? "warn"
          : "ok";
  return { rule, date, daysLeft, tone };
}

/** Human form: "in 14 days", "in 3 months", "passed 12 days ago". */
export function describeDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) {
    const d = -daysLeft;
    return d === 1 ? "passed yesterday" : `passed ${d} days ago`;
  }
  if (daysLeft === 0) return "today";
  if (daysLeft < 60) return `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  const months = Math.round(daysLeft / 30);
  return `in about ${months} month${months === 1 ? "" : "s"}`;
}

/** The intake checklist stored on `leads.intake`. All optional booleans. */
export type IntakeChecklist = {
  /** Defendant is a public entity (city, county, state, transit agency…). */
  government_entity?: boolean;
  /** Client received medical treatment for the injury. */
  treated_medically?: boolean;
  /** A police / incident report exists. */
  police_report?: boolean;
  /** Other side's insurance information collected. */
  insurance_info?: boolean;
  /** Photos, video or witness details collected. */
  evidence_collected?: boolean;
  /** Client has signed the retainer. */
  retainer_signed?: boolean;
};

export const INTAKE_ITEMS: Array<{
  key: keyof IntakeChecklist;
  label: string;
  hint?: string;
}> = [
  {
    key: "government_entity",
    label: "Public entity involved",
    hint: "Changes the deadline to a 6-month claim.",
  },
  { key: "treated_medically", label: "Medical treatment received" },
  { key: "police_report", label: "Police / incident report" },
  { key: "insurance_info", label: "Insurance information collected" },
  { key: "evidence_collected", label: "Photos, video or witnesses" },
  { key: "retainer_signed", label: "Retainer signed" },
];
