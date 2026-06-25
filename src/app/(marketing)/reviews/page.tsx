import { notFound } from "next/navigation";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonial-card";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
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
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Reviews", path: "/reviews" },
        ]}
      />
      {reviewsSchema ? (
        <script
          type="application/ld+json"
          id="reviews-jsonld"
          dangerouslySetInnerHTML={{ __html: jsonLd(reviewsSchema) }}
        />
      ) : null}

      <PageHero
        eyebrow="Client experiences"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
        title="MMG Law Firm Client Reviews"
        description={DISCLAIMERS.testimonial}
        aside={
          <AttorneyHeroAside
            image={pickLocationImage("reviews").name}
            alt={pickLocationImage("reviews").alt}
            priority
          />
        }
      />

      <TestimonialsSection testimonials={testimonials} />
      <CtaBand />
    </>
  );
}
