import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

import type { FaqItem } from "@/lib/data/faqs";

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
    <section className={cn("container-page py-16 md:py-24", className)}>
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            FAQ
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            {heading}
          </h2>
          {subheading ? (
            <p className="mt-3 text-muted-foreground">{subheading}</p>
          ) : null}
        </div>
        <Accordion className="w-full">
          {items.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
