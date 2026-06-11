import dynamic from "next/dynamic";

import { AttorneyBioCard } from "@/components/marketing/attorney-bio-card";
import { CaseResultsSection } from "@/components/marketing/case-result-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HomepageStats } from "@/components/marketing/homepage-stats";
import { HowWeWork } from "@/components/marketing/how-we-work";
import { LocationsList } from "@/components/marketing/locations-list";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { RecognitionStrip } from "@/components/marketing/recognition-strip";
import { TestimonialsSection } from "@/components/marketing/testimonial-card";
import { WhyMmg } from "@/components/marketing/why-mmg";

// LeadForm pulls in react-hook-form + zod + Turnstile — it sits well below
// the fold on the homepage, so lazy-load its client chunk while still
// SSRing the markup so the form is present for crawlers.
const LeadForm = dynamic(() =>
  import("@/components/marketing/lead-form").then((m) => m.LeadForm),
);
import { FIRM } from "@/lib/constants";
import { getHomepageFaqs } from "@/lib/data/firm-settings";
import {
  getApprovedTestimonials,
  getPublishedCaseResults,
} from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal-Injury Attorney",
  description:
    "Mihran M. Ghazaryan, Esq. — California personal-injury counsel based in Glendale. Free consultation. No fee unless we win your case.",
  path: "/",
});

export const revalidate = 3600;

export default async function HomePage() {
  const [caseResults, testimonials, faqs] = await Promise.all([
    getPublishedCaseResults(3),
    getApprovedTestimonials(3),
    getHomepageFaqs(),
  ]);
  return (
    <>
      <Hero />
      <HomepageStats />
      <RecognitionStrip />
      <PracticeAreaGrid />
      <WhyMmg />
      <HowWeWork />
      <AttorneyBioCard />
      <CaseResultsSection results={caseResults} />
      <TestimonialsSection testimonials={testimonials} />
      <LocationsList />

      <section className="container-page py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Tell us what happened
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
              Free consultation. We&apos;ll call you back.
            </h2>
            <p className="mt-4 text-muted-foreground">
              You&apos;re not committing to anything by reaching out — and there
              is no fee unless we win your case. Tell us briefly what happened
              and we&apos;ll be in touch within one business hour during office
              hours.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Prefer to call?{" "}
              <a
                href={`tel:${FIRM.phoneTel}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {FIRM.phone}
              </a>
              {" "}— {FIRM.hours}.
            </p>
          </div>
          <LeadForm variant="compact" />
        </div>
      </section>

      <Faq items={faqs} />
      <CtaBand />
    </>
  );
}
