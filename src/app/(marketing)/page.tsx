import { AttorneyBioCard } from "@/components/marketing/attorney-bio-card";
import {
  CaseResultsSection,
  type CaseResult,
} from "@/components/marketing/case-result-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { LeadForm } from "@/components/marketing/lead-form";
import { LocationsList } from "@/components/marketing/locations-list";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import {
  TestimonialsSection,
  type Testimonial,
} from "@/components/marketing/testimonial-card";
import { WhyMmg } from "@/components/marketing/why-mmg";
import { HOMEPAGE_FAQS } from "@/lib/data/faqs";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal-Injury Attorney",
  description:
    "Mihran M. Ghazaryan, Esq. — California personal-injury counsel based in Glendale. Free consultation. No fee unless we win your case.",
  path: "/",
});

// Group D will load published case_results from Supabase here. Per spec §17,
// we never invent case results — until the attorney provides verified entries
// the section renders an empty state.
const HOMEPAGE_CASE_RESULTS: CaseResult[] = [];

// Group E will load approved testimonials from Supabase here. Same constraint.
const HOMEPAGE_TESTIMONIALS: Testimonial[] = [];

export default function HomePage() {
  return (
    <>
      <Hero />
      <PracticeAreaGrid />
      <WhyMmg />
      <AttorneyBioCard />
      <CaseResultsSection results={HOMEPAGE_CASE_RESULTS} />
      <TestimonialsSection testimonials={HOMEPAGE_TESTIMONIALS} />
      <LocationsList />

      <section className="container-page py-16 md:py-24">
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
                href={`tel:+18185685818`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                (818) 568-5818
              </a>
              {" "}— Mon–Fri 9:00 to 18:00.
            </p>
          </div>
          <LeadForm variant="compact" />
        </div>
      </section>

      <Faq items={HOMEPAGE_FAQS} />
      <CtaBand />
    </>
  );
}
