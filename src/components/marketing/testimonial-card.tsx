import { Quote, Star } from "lucide-react";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

export type Testimonial = {
  id: string;
  quote: string;
  initials: string;
  city?: string;
  rating?: number;
  practiceArea?: string;
};

type Props = { testimonial: Testimonial; className?: string };

export function TestimonialCard({ testimonial, className }: Props) {
  const rating = Math.max(0, Math.min(5, testimonial.rating ?? 5));
  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7",
        className,
      )}
    >
      <Quote
        className="absolute right-5 top-5 h-16 w-16 text-primary/[0.06]"
        aria-hidden
      />
      <div
        className="flex items-center gap-0.5"
        aria-label={`${rating} of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            aria-hidden
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-[var(--color-gold-500)] text-[var(--color-gold-500)]" : "text-muted",
            )}
          />
        ))}
      </div>
      <p className="relative mt-5 text-base leading-relaxed text-foreground">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <p className="text-sm font-medium">
          {testimonial.initials}
          {testimonial.city ? (
            <span className="text-muted-foreground">
              {" "}
              &middot; {testimonial.city}
            </span>
          ) : null}
        </p>
        {testimonial.practiceArea ? (
          <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {testimonial.practiceArea}
          </span>
        ) : null}
      </div>
    </article>
  );
}

type SectionProps = {
  testimonials: Testimonial[];
  className?: string;
};

/**
 * Testimonials section with empty state. Group E will pull from
 * Supabase `testimonials` where `is_approved=true`. Per spec §17, we never
 * invent client quotes.
 */
export function TestimonialsSection({
  testimonials,
  className,
}: SectionProps) {
  return (
    <section className={cn("border-y border-border bg-secondary/50", className)}>
      <div className="container-page py-20 md:py-28">
        <div className="max-w-2xl">
          <SectionEyebrow>Client experiences</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            What clients say
          </h2>
        </div>

        {testimonials.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              Client testimonials appear here once they&apos;ve been reviewed
              and approved for publication. In the meantime, see Yelp or
              Google for public reviews of the firm.
            </p>
          </div>
        ) : (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}

        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {DISCLAIMERS.testimonial}
        </p>
      </div>
    </section>
  );
}
