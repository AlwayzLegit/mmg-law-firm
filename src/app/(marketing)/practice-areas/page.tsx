import { CtaBand } from "@/components/marketing/cta-band";
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
      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-16 md:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Practice areas
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            Personal injury, across every common cause of injury in California.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            We focus exclusively on personal injury — and within that, on the
            kinds of cases we know how to win. Pick the area that matches your
            situation, or call us if you&apos;re not sure where it fits.
          </p>
        </div>
      </section>

      <PracticeAreaGrid heading="Choose your situation" subheading="Click any area for what we handle, how we work, and what to do next." />
      <CtaBand />
    </>
  );
}
