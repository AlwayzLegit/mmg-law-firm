import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { FIRM } from "@/lib/constants";

import { SectionEyebrow } from "./section-eyebrow";

type Props = {
  /** Lower-cased practice label for the heading, e.g. "car accidents",
   *  "employment law". */
  practiceLabel: string;
  /** Markdown paragraph from getAttorneyHelp(). */
  body: string;
};

/**
 * "How our attorney helps with {practice}" — a trust section that names the
 * attorney and describes how he personally handles this kind of matter.
 * Rendered on the practice-area hub and every city × practice page.
 */
export function AttorneyHelpSection({ practiceLabel, body }: Props) {
  return (
    <section className="border-border bg-secondary/40 mt-12 rounded-2xl border p-8">
      <SectionEyebrow>Our attorney</SectionEyebrow>
      <h2 className="font-display mt-4 text-2xl font-medium tracking-tight md:text-3xl">
        How {FIRM.attorneyName} helps with {practiceLabel}
      </h2>
      <div className="prose prose-neutral text-muted-foreground mt-4 max-w-none leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </section>
  );
}
