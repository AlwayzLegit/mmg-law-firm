/**
 * Homepage FAQ fallback. The canonical source is
 * `firm_settings.homepage_faqs_json`, edited at /admin/settings/firm. Until
 * the attorney saves a non-empty list there, the homepage renders the array
 * below (and dev-without-Supabase always uses it).
 *
 * Per-practice-area FAQs live on `practice_areas.faq_json` and are edited
 * at /admin/content/practice-areas/[id].
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export const HOMEPAGE_FAQS: FaqItem[] = [
  {
    question: "How much does it cost to hire a personal-injury attorney?",
    answer:
      "Our consultation is free, and we work on a contingency-fee basis: you pay no attorney fees unless we recover compensation for you. The fee is a percentage of the recovery, agreed up front in writing — never a surprise.",
  },
  {
    question: "How long do I have to file a claim in California?",
    answer:
      "California's general statute of limitations for personal-injury matters is two years from the date of injury, but several exceptions apply (claims against government entities, for example, must typically be filed within six months). The sooner you contact us, the more options you have.",
  },
  {
    question: "What is my case worth?",
    answer:
      "Case value depends on injury severity, medical treatment, lost income, future care needs, the strength of liability evidence, and the available insurance coverage. We won't quote a number until we have looked at the facts — and any attorney who promises a specific figure before reviewing your case is doing you a disservice.",
  },
  {
    question:
      "Do I still have a case if the accident was partly my fault?",
    answer:
      "Yes — California is a pure comparative-fault state. Your recovery is reduced by your percentage of fault, but you can still recover even if you were largely responsible. We frequently negotiate down or eliminate fault percentages insurers try to assign to our clients.",
  },
  {
    question: "Will I have to go to court?",
    answer:
      "Most personal-injury matters resolve through pre-trial settlement. We prepare every case as if it will go to trial, because that posture leads to better settlements — but we are equally prepared to take a case in front of a jury when the insurer refuses to be reasonable.",
  },
  {
    question: "What should I do right after an accident?",
    answer:
      "Get medical attention immediately, document the scene if you can do so safely (photos, witness contacts), file a report with the appropriate agency, and avoid recorded statements with the other side's insurance company until you have spoken with an attorney. Then call us — early evidence preservation often makes or breaks a case.",
  },
];
