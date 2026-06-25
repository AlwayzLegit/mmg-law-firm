/**
 * Locally-scoped FAQ generator for county and city landing pages, which
 * otherwise ship no FAQ section or FAQ schema. Answers are grounded in
 * verifiable California law (statute of limitations) and firm policy
 * (contingency fee, Glendale base, languages) — no invented results or
 * guarantees.
 *
 * // TODO(human): attorney review required — these answers are AI-drafted
 * // summaries of California law and firm policy. Confirm the statute-of-
 * // limitations framing (Code of Civil Procedure §335.1, Government Code
 * // §911.2) and the contingency-fee wording before relying on them.
 */

import { FIRM } from "@/lib/constants";

export type LocalFaqItem = { question: string; answer: string };

/**
 * Build 4–5 factual FAQ items for a place (city or county). Pass
 * `countyName` to include a "which court" answer (useful on city pages,
 * which don't otherwise surface court information).
 */
export function localFaqItems(opts: {
  /** City or county display name, e.g. "Glendale" or "Los Angeles County". */
  place: string;
  /** County name for the "which court" answer. Omit to skip that question. */
  countyName?: string;
}): LocalFaqItem[] {
  const { place, countyName } = opts;

  const items: LocalFaqItem[] = [
    {
      question: `How long do I have to file a personal injury claim in ${place}?`,
      answer: `Most California personal-injury claims must be filed within two years of the injury (Code of Civil Procedure §335.1). Claims against a government entity are much shorter — generally a written claim within six months (Government Code §911.2). Exceptions run in both directions, so call us to confirm the deadline that applies to your case.`,
    },
    {
      question: `Do I have to come to your office to work with you?`,
      answer: `No. ${FIRM.legalName} is based in ${FIRM.address.city} and represents clients throughout ${place}. We handle most of a case by phone, email, and our secure document portal, and we arrange in-person meetings when they help.`,
    },
    {
      question: `How much does it cost to hire ${FIRM.legalName}?`,
      answer: `Nothing up front. We work on a contingency fee — you pay no attorney's fee unless we recover compensation for you — and the initial consultation is always free.`,
    },
    {
      question: `What languages do you offer consultations in?`,
      answer: `We offer consultations in ${FIRM.languages.join(", ")}.`,
    },
  ];

  if (countyName) {
    items.splice(1, 0, {
      question: `Which court handles ${place} personal injury cases?`,
      answer: `Personal-injury lawsuits for ${place} are generally filed in the ${countyName} Superior Court. We handle filings and court appearances there as part of representing you.`,
    });
  }

  return items;
}
