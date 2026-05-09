import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonial-card";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { getApprovedTestimonials } from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Client Reviews",
  description: `Approved client reviews of ${FIRM.legalName}. Testimonials reflect the experiences of individual clients; results vary.`,
  path: "/reviews",
});

export const revalidate = 86400;

export default async function ReviewsPage() {
  const testimonials = await getApprovedTestimonials();
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Reviews", path: "/reviews" },
        ]}
      />

      <PageHero
        eyebrow="Client experiences"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
        title="What clients say."
        description={DISCLAIMERS.testimonial}
      />

      <TestimonialsSection testimonials={testimonials} />
      <CtaBand />
    </>
  );
}
