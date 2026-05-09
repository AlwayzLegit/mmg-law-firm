import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Practice Areas",
  description:
    "California personal-injury practice areas — car, truck, motorcycle, pedestrian, bicycle, slip-and-fall, wrongful death, dog bites, and rideshare accidents.",
  path: "/practice-areas",
});

export default function PracticeAreasPage() {
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Practice Areas", path: "/practice-areas" },
        ]}
      />

      <PageHero
        eyebrow="Practice areas"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Practice Areas" },
        ]}
        title={
          <>
            Personal injury, across every cause of injury{" "}
            <span className="text-primary">in California.</span>
          </>
        }
        description="We focus exclusively on personal injury — and within that, on the kinds of cases we know how to win. Pick the area that matches your situation, or call us if you're not sure where it fits."
      />

      <PracticeAreaGrid
        heading="Choose your situation"
        subheading="Click any area for what we handle, how we work, and what to do next."
      />
      <CtaBand />
    </>
  );
}
