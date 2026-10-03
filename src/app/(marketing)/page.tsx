import dynamic from "next/dynamic";
import { CircleCheck, Phone, ShieldCheck } from "lucide-react";

import { AttorneyBioCard } from "@/components/marketing/attorney-bio-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HomepageStats } from "@/components/marketing/homepage-stats";
import { HowWeWork } from "@/components/marketing/how-we-work";
import { KnowYourRights } from "@/components/marketing/know-your-rights";
import { LocationsList } from "@/components/marketing/locations-list";
import { PracticeAreaExplorer } from "@/components/marketing/practice-area-explorer";
import { Eyebrow } from "@/components/marketing/primitives/eyebrow";
import { Reveal } from "@/components/marketing/primitives/reveal";
import { RecognitionStrip } from "@/components/marketing/recognition-strip";
import { TrustBlock } from "@/components/marketing/trust-block";
import { WhyMmg } from "@/components/marketing/why-mmg";

// LeadForm pulls in react-hook-form + zod + Turnstile — it sits well below
// the fold on the homepage, so lazy-load its client chunk while still
// SSRing the markup so the form is present for crawlers.
const LeadForm = dynamic(() =>
  import("@/components/marketing/lead-form").then((m) => m.LeadForm),
);
import { FIRM } from "@/lib/constants";
import { getFirmBadges, getHomepageFaqs } from "@/lib/data/firm-settings";
import {
  getApprovedTestimonials,
  getPublishedCaseResults,
} from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage } from "@/lib/seo/schema";
import { jsonLd } from "@/lib/seo/json-ld";

export const metadata = buildMetadata({
  title: "California Personal-Injury Attorney",
  description:
    "Mihran M. Ghazaryan, Esq. — California personal-injury counsel based in Glendale. Free consultation. No fee unless we win your case.",
  path: "/",
});

export const revalidate = 3600;

export default async function HomePage() {
  const [caseResults, testimonials, badges, faqs] = await Promise.all([
    getPublishedCaseResults(3),
    getApprovedTestimonials(3),
    getFirmBadges(),
    getHomepageFaqs(),
  ]);
  const faqGraph = faqs.length > 0 ? buildFaqPage(faqs) : null;
  return (
    <>
      {faqGraph ? (
        <script
          type="application/ld+json"
          id="homepage-faq-jsonld"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqGraph) }}
        />
      ) : null}
      <Hero />
      <HomepageStats />
      <RecognitionStrip />
      <TrustBlock results={caseResults} testimonials={testimonials} badges={badges} />
      <PracticeAreaExplorer />
      <WhyMmg />
      <HowWeWork />
      <KnowYourRights />
      <AttorneyBioCard />
      <LocationsList />

      <section id="contact" className="bg-background text-foreground">
        <div className="container-page section-pad grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-12">
          <Reveal className="pt-4">
            <Eyebrow>Tell us what happened</Eyebrow>
            <h2 className="text-display mt-3.5 font-semibold">
              Free consultation. <em className="em-gold">We&apos;ll call you back.</em>
            </h2>
            <p className="text-stone mt-4 max-w-[50ch] text-base">
              You&apos;re not committing to anything by reaching out — and there
              is no fee unless we win your case. Tell us briefly what happened
              and we&apos;ll be in touch within one business hour during office
              hours.
            </p>
            <div className="surface-ink bg-background text-foreground mt-8 flex flex-wrap items-center gap-[18px] rounded-2xl px-6 py-[22px]">
              <span className="bg-gold text-ink inline-flex h-12 w-12 flex-none items-center justify-center rounded-full">
                <Phone className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-cream/55 m-0 text-[11px] tracking-[0.16em] uppercase">Prefer to call?</p>
                <a
                  href={`tel:${FIRM.phoneTel}`}
                  className="font-display text-cream hover:text-gold mt-0.5 block text-[34px] leading-none font-semibold tracking-[-0.02em] no-underline transition-colors"
                >
                  {FIRM.phone}
                </a>
                <p className="text-cream/60 m-0 mt-1 text-[13px]">{FIRM.hours}.</p>
              </div>
            </div>
            <ul className="text-stone m-0 mt-6 grid list-none grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 p-0 text-[13px]">
              <li className="flex items-center gap-2">
                <ShieldCheck className="text-gold-deep h-4 w-4" aria-hidden />
                No fee unless we win
              </li>
              <li className="flex items-center gap-2">
                <CircleCheck className="text-gold-deep h-4 w-4" aria-hidden />
                Reply in 1 business hr
              </li>
              <li className="flex items-center gap-2">
                <Phone className="text-gold-deep h-4 w-4" aria-hidden />
                Confidential intake
              </li>
            </ul>
          </Reveal>
          <Reveal delay={80}>
            <LeadForm variant="compact" />
          </Reveal>
        </div>
      </section>

      <Faq items={faqs} />
      <CtaBand />
    </>
  );
}
