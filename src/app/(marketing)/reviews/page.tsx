import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonial-card";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { getApprovedTestimonials } from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildReviewsSchema } from "@/lib/seo/schema";
import { jsonLd } from "@/lib/seo/json-ld";

export const metadata = buildMetadata({
  title: "California Personal Injury Lawyer Reviews",
  description: `Approved client reviews of ${FIRM.legalName}. Testimonials reflect the experiences of individual clients; results vary.`,
  path: "/reviews",
});

export const revalidate = 86400;

export default async function ReviewsPage() {
  const testimonials = await getApprovedTestimonials();
  // No approved testimonials → no page (nav link + sitemap entry are
  // suppressed in tandem). Only reachable via a direct URL.
  if (testimonials.length === 0) notFound();
  const reviewsSchema = buildReviewsSchema(testimonials);
  const ratings = testimonials.map((t) => Math.max(1, Math.min(5, t.rating ?? 5)));
  const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Reviews", path: "/reviews" },
        ]}
      />
      {reviewsSchema ? (
        <script type="application/ld+json" id="reviews-jsonld" dangerouslySetInnerHTML={{ __html: jsonLd(reviewsSchema) }} />
      ) : null}

      <PageHero
        eyebrow="Client experiences"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
        title={
          <>
            {FIRM.legalName} <em className="em-gold">Client Reviews</em>
          </>
        }
        description={DISCLAIMERS.testimonial}
        aside={
          <div className="bg-cream/5 border-cream/12 w-full max-w-[340px] rounded-2xl border px-6 py-[22px] lg:justify-self-end">
            <p className="text-cream/55 micro-label m-0">Aggregate rating</p>
            <p className="m-0 mt-2 flex items-baseline gap-2.5">
              <span className="font-display text-cream text-[56px] leading-none font-semibold tracking-[-0.03em]">{avg}</span>
              <span className="inline-flex gap-[3px]" aria-label={`${avg} out of 5`}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.round(avg) ? "fill-gold text-gold" : "text-cream/25"}`} aria-hidden />
                ))}
              </span>
            </p>
            <p className="text-cream/60 m-0 mt-2 text-[12.5px]">
              Based on {testimonials.length} approved client review{testimonials.length === 1 ? "" : "s"}.
            </p>
          </div>
        }
      />

      <TestimonialsSection testimonials={testimonials} />
      <CtaBand />
    </>
  );
}
