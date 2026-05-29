import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import type { FaqItem } from "@/lib/data/faqs";

import { SectionEyebrow } from "./section-eyebrow";

type Props = {
  items: FaqItem[];
  heading?: string;
  subheading?: string;
  className?: string;
};

export function Faq({
  items,
  heading = "Frequently asked",
  subheading,
  className,
}: Props) {
  if (items.length === 0) return null;
  return (
    <section
      className={cn(
        "relative border-y border-border/50 bg-secondary/30 py-20 md:py-28",
        className,
      )}
    >
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div>
          <SectionEyebrow>FAQ</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {heading}
          </h2>
          {subheading ? (
            <p className="mt-4 text-muted-foreground">{subheading}</p>
          ) : null}
        </div>
        <Accordion className="w-full">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="py-5 text-left text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
