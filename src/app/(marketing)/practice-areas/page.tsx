import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import {
  PracticeAreasHeroAside,
  practiceAreasHeroImageExists,
} from "@/components/marketing/practice-areas-hero-aside";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal Injury & Employment Law Practice Areas",
  description:
    "California practice areas — car, truck, motorcycle, pedestrian, bicycle, slip-and-fall, wrongful death, dog bites, rideshare, and catastrophic-injury cases, plus employment law: wrongful termination, discrimination, and unpaid wages.",
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
            Personal injury and employment law{" "}
            <span className="text-primary">in California.</span>
          </>
        }
        description="Personal injury is the heart of our practice — and we also stand up for California employees. Pick the area that matches your situation, or call us if you're not sure where it fits."
        aside={practiceAreasHeroImageExists() ? <PracticeAreasHeroAside /> : undefined}
      />

      <PracticeAreaGrid
        heading="Choose your situation"
        subheading="Click any area for what we handle, how we work, and what to do next."
      />
      <CtaBand />
    </>
  );
}
