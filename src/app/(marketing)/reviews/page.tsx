import { CtaBand } from "@/components/marketing/cta-band";
import { TestimonialsSection } from "@/components/marketing/testimonial-card";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Client Reviews",
  description: `Approved client reviews of ${FIRM.legalName}. Testimonials reflect the experiences of individual clients; results vary.`,
  path: "/reviews",
});

export const revalidate = 86400;

// TODO(group-e): pull approved testimonials from Supabase. Empty state per
// spec §17 — never fabricate client quotes.
const TESTIMONIALS = [] as const;

export default function ReviewsPage() {
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Reviews", path: "/reviews" },
        ]}
      />

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Client experiences
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            What clients say
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {DISCLAIMERS.testimonial}
          </p>
        </div>
      </section>

      <TestimonialsSection testimonials={[...TESTIMONIALS]} />
      <CtaBand />
    </>
  );
}
