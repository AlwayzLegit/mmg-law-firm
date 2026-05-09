import { Quote, Star } from "lucide-react";

import { DISCLAIMERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
        "flex h-full flex-col rounded-xl border border-border bg-card p-6",
        className,
      )}
    >
      <Quote className="h-6 w-6 text-primary/40" aria-hidden />
      <p className="mt-4 text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-medium">
          {testimonial.initials}
          {testimonial.city ? (
            <span className="text-muted-foreground"> &middot; {testimonial.city}</span>
          ) : null}
        </p>
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
                i < rating ? "fill-amber-500 text-amber-500" : "text-muted",
              )}
            />
          ))}
        </div>
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
    <section
      className={cn(
        "border-y border-border bg-secondary/40",
        className,
      )}
    >
      <div className="container-page py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Client experiences
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            What clients say
          </h2>
        </div>

        {testimonials.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">
              Approved client testimonials will appear here once attorney has
              reviewed them for publication.
            </p>
            {/* TODO(human): approve testimonials in /admin/content/testimonials */}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((t) => (
              <TestimonialCard key={t.id} testimonial={t} />
            ))}
          </div>
        )}

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          {DISCLAIMERS.testimonial}
        </p>
      </div>
    </section>
  );
}
