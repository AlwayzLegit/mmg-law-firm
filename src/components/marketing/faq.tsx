import { cn } from "@/lib/utils";

import type { FaqItem } from "@/lib/data/faqs";

import { DetailsAccordion } from "./primitives/details-accordion";
import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";

type Props = {
  items: FaqItem[];
  heading?: string;
  subheading?: string;
  className?: string;
};

/**
 * FAQ (redesign v2): centred 860px column of white <details> cards. Every
 * answer is in the HTML; the first item is open by default.
 */
export function Faq({ items, heading = "Frequently asked", subheading, className }: Props) {
  if (items.length === 0) return null;
  return (
    <section className={cn("surface-paper-2 bg-background text-foreground border-line border-t", className)}>
      <div className="section-pad-sm mx-auto max-w-[860px] px-[clamp(16px,4vw,28px)]">
        <Reveal className="text-center">
          <Eyebrow centered>FAQ</Eyebrow>
          <h2 className="text-display mt-3.5 font-semibold">{heading}</h2>
          {subheading ? <p className="text-stone mx-auto mt-4 max-w-[60ch]">{subheading}</p> : null}
        </Reveal>
        <Reveal delay={80} className="mt-9">
          <DetailsAccordion
            name={`faq-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            titleAs="h3"
            items={items.map((it) => ({ title: it.question, body: it.answer }))}
          />
        </Reveal>
      </div>
    </section>
  );
}
