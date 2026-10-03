import { Star } from "lucide-react";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";

export type Testimonial = {
  id: string;
  quote: string;
  initials: string;
  city?: string;
  rating?: number;
  practiceArea?: string;
};

type Props = { testimonial: Testimonial; className?: string };

/** White review card: gold stars, quote, avatar circle with initials. */
export function TestimonialCard({ testimonial, className }: Props) {
  const rating = Math.max(0, Math.min(5, testimonial.rating ?? 5));
  return (
    <article
      className={cn("bg-card border-line relative flex h-full flex-col rounded-2xl border p-[22px]", className)}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              aria-hidden
              className={cn("h-3.5 w-3.5", i < rating ? "fill-gold text-gold" : "text-ink/15")}
            />
          ))}
        </span>
        {testimonial.practiceArea ? (
          <span className="bg-gold-tint text-gold-deep rounded-full px-2 py-[3px] text-[10px] font-semibold tracking-[0.12em] uppercase">
            {testimonial.practiceArea}
          </span>
        ) : null}
      </div>
      <p className="text-foreground mt-4 text-[15px] leading-[1.65]">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="mt-auto flex items-center gap-2.5 pt-[18px]">
        <span
          aria-hidden
          className="bg-ink text-cream font-display inline-flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full text-[13px] font-semibold"
        >
          {testimonial.initials}
        </span>
        <span className="grid text-[13px] leading-tight">
          <span className="font-semibold">{testimonial.initials}</span>
          {testimonial.city ? <span className="text-stone">{testimonial.city}</span> : null}
        </span>
      </div>
    </article>
  );
}

type SectionProps = {
  testimonials: Testimonial[];
  className?: string;
  /** Rendered without its own section wrapper (inside the trust block). */
  embedded?: boolean;
};

/**
 * Testimonials. Hidden entirely when there are no approved testimonials — we
 * never show an empty placeholder on the public site. Per spec §17, we never
 * invent client quotes.
 */
export function TestimonialsSection({ testimonials, className, embedded = false }: SectionProps) {
  if (testimonials.length === 0) return null;
  const body = (
    <>
      <Reveal>
        <Eyebrow>Client experiences</Eyebrow>
        <h2 className="text-display mt-3.5 font-semibold">What clients say</h2>
      </Reveal>
      <Reveal delay={60}>
        <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5 p-0">
          {testimonials.map((t) => (
            <li key={t.id}>
              <TestimonialCard testimonial={t} />
            </li>
          ))}
        </ul>
      </Reveal>
      <p className="text-stone mt-3 max-w-3xl text-xs leading-relaxed">{DISCLAIMERS.testimonial}</p>
    </>
  );
  if (embedded) return <div className={className}>{body}</div>;
  return (
    <section className={cn("bg-background text-foreground surface-paper-2 border-line border-t", className)}>
      <div className="container-page section-pad-sm">{body}</div>
    </section>
  );
}
