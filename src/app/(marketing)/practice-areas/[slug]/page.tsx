import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Clock, Languages, ShieldCheck, User } from "lucide-react";

import { AttorneyHelpSection } from "@/components/marketing/attorney-help-section";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { CaseResultCard } from "@/components/marketing/case-result-card";
import { CompensationSection } from "@/components/marketing/compensation-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { DeadlinesCallout } from "@/components/marketing/deadlines-callout";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero, type HeroFact } from "@/components/marketing/page-hero";
import { JumpNav, type JumpItem } from "@/components/marketing/practice/jump-nav";
import { ProcessTimeline } from "@/components/marketing/practice/process-timeline";
import { SubtopicCards } from "@/components/marketing/practice/subtopic-cards";
import { WhatToDoPanel } from "@/components/marketing/practice/what-to-do";
import { DetailsAccordion } from "@/components/marketing/primitives/details-accordion";
import { Eyebrow } from "@/components/marketing/primitives/eyebrow";
import { RelatedPracticeAreas } from "@/components/marketing/related-practice-areas";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { PRACTICE_AREA_IMAGE, pickLocationImage } from "@/lib/media";
import {
  PRACTICE_AREAS,
  findPracticeArea,
  lawyerPhraseTitle,
} from "@/lib/data/practice-areas";
import { getPracticeAreaContent } from "@/lib/data/practice-area-queries";
import { getAttorneyHelp } from "@/lib/data/practice-area-content";
import { getPublishedLocationPages } from "@/lib/data/queries";
import { getCaseResultsForPracticeArea } from "@/lib/data/public-content";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return PRACTICE_AREAS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const area = findPracticeArea(slug);
  if (!area) {
    return buildMetadata({
      title: "Not found",
      description: "Practice area not found.",
      path: `/practice-areas/${slug}`,
      noindex: true,
    });
  }
  const resolved = await getPracticeAreaContent(slug);
  return buildMetadata({
    title: `California ${lawyerPhraseTitle(area)}`,
    description:
      resolved?.meta_description ??
      `${resolved?.intro ?? area.intro} Free consultation with ${FIRM.attorneyName}.`,
    path: `/practice-areas/${area.slug}`,
    image: null, // per-page opengraph-image.tsx
  });
}

/** "Car Accident Lawyer" → California <em>Car Accident</em> Lawyer. */
function heroTitle(phrase: string) {
  const m = /^(.*) (Lawyer)$/.exec(phrase);
  if (!m) return <>California {phrase}</>;
  return (
    <>
      California <em className="em-gold">{m[1]}</em> {m[2]}
    </>
  );
}

export default async function PracticeAreaPage({ params }: Props) {
  const { slug } = await params;
  const area = findPracticeArea(slug);
  if (!area) notFound();

  const [content, inlineResults, locationPages] = await Promise.all([
    getPracticeAreaContent(slug),
    getCaseResultsForPracticeArea(slug, 3),
    getPublishedLocationPages(),
  ]);
  if (!content) notFound();

  // City pages with published local copy for THIS practice area. Surfacing
  // them as links gives each city × practice money page more than one inbound
  // internal link (Semrush "only one internal link" notice) and lets the
  // authoritative practice hub pass topical signal down to them.
  const cityLinks = locationPages
    .filter((p) => p.practice_area_slug === slug)
    .sort((a, b) => a.city_name.localeCompare(b.city_name));

  const path = `/practice-areas/${area.slug}`;
  const isEmployment = area.category === "employment";

  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${canonicalUrl(path)}#legal-service`,
    name: `${FIRM.legalName} — ${area.name}`,
    url: canonicalUrl(path),
    image: defaultOgImageUrl(),
    description: content.intro,
    telephone: FIRM.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    areaServed: { "@type": "State", name: "California" },
    parentOrganization: { "@id": FIRM_LEGAL_SERVICE_ID },
    // `knowsAbout` (valid on Organization/LegalService) carries the topical
    // signal; `serviceType` is only valid on schema.org Service and was
    // flagged NOT_RECOGNIZED in the site audit.
    knowsAbout: area.lawyerPhrase,
  };

  const faqGraph = content.faqs.length > 0 ? buildFaqPage(content.faqs) : null;

  const heroImage = PRACTICE_AREA_IMAGE[slug]
    ? { src: PRACTICE_AREA_IMAGE[slug], alt: `${area.name} representation in California`, priority: true }
    : { src: pickLocationImage(slug).name, alt: pickLocationImage(slug).alt, priority: true };

  const facts: HeroFact[] = [
    { icon: <ShieldCheck />, label: "No fee unless we win" },
    {
      icon: <Clock />,
      label: isEmployment ? "Strict filing deadlines — call early" : "2-year filing deadline for most claims",
    },
    { icon: <Languages />, label: FIRM.languages.join(" · ") },
    { icon: <User />, label: `${FIRM.attorneyName} handles your case directly` },
  ];

  const jumps: JumpItem[] = [
    { id: "overview", label: "Overview" },
    { id: "attorney", label: `How ${FIRM.attorneyName.split(" ")[0]} helps` },
    { id: "compensation", label: isEmployment ? "Remedies" : "Compensation" },
    ...(content.process.length > 0 ? [{ id: "process", label: "Process" }] : []),
    ...(content.whatToDo.length > 0 ? [{ id: "what-to-do", label: "What to do" }] : []),
    { id: "deadlines", label: "Deadlines" },
    ...(content.faqs.length > 0 ? [{ id: "faq", label: "FAQ" }] : []),
    { id: "related", label: "Related" },
  ];

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Practice Areas", path: "/practice-areas" },
          { name: area.name, path },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(legalService) }}
      />
      {faqGraph ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqGraph) }}
        />
      ) : null}

      <PageHero
        eyebrow={`Attorney Advertising · ${isEmployment ? "Employment law" : "Personal injury"}`}
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Practice Areas", href: "/practice-areas" },
          { label: area.name },
        ]}
        title={heroTitle(lawyerPhraseTitle(area))}
        description={content.intro}
        image={heroImage}
        facts={facts}
        actions={
          <>
            <Link href="#intake" className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}>
              <span>Free consultation</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
            </Link>
            <a href={`tel:${FIRM.phoneTel}`} className={buttonVariants({ variant: "outline-cream", size: "pill" })}>
              Call {FIRM.phone}
            </a>
          </>
        }
      />

      <JumpNav items={jumps} />

      <article className="container-page grid items-start gap-12 pt-[clamp(40px,6vw,64px)] pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="min-w-0">
          <section id="overview" className="scroll-mt-[130px]">
            {content.body_from_db ? (
              <div className="prose-v2 text-[17px]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.body_md}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-[19px] leading-[1.65]">{content.body_md || content.intro}</p>
            )}
          </section>

          <AttorneyHelpSection
            id="attorney"
            practiceLabel={area.name.toLowerCase()}
            body={getAttorneyHelp(area.slug, area.nounSingular)}
          />

          <SubtopicCards subtopics={content.subtopics} areaIcon={area.icon} />

          <CompensationSection id="compensation" nounSingular={area.nounSingular} category={area.category} />

          <ProcessTimeline id="process" steps={content.process} />

          <WhatToDoPanel id="what-to-do" items={content.whatToDo} />

          <DeadlinesCallout id="deadlines" category={area.category} />

          {inlineResults.length > 0 ? (
            <section className="mt-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-display-sm font-semibold">Recent {area.shortName.toLowerCase()} results</h2>
                <Link
                  href="/case-results"
                  className="group/link text-foreground inline-flex items-center gap-1.5 text-sm font-semibold no-underline"
                >
                  <span className="underline-offset-4 group-hover/link:underline">View all results</span>
                  <span className="transition-transform group-hover/link:translate-x-0.5">&rarr;</span>
                </Link>
              </div>
              <div className="mt-6 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {inlineResults.map((r) => (
                  <CaseResultCard key={r.id} result={r} />
                ))}
              </div>
              <p className="text-stone mt-4 text-xs">{DISCLAIMERS.results}</p>
            </section>
          ) : null}

          {content.faqs.length > 0 ? (
            <section id="faq" className="mt-14 scroll-mt-[130px]">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="text-display-sm mt-3 font-semibold">{area.shortName} FAQ</h2>
              <DetailsAccordion
                name={`faq-${area.slug}`}
                titleAs="h3"
                className="mt-6"
                items={content.faqs.map((f) => ({ title: f.question, body: f.answer }))}
              />
            </section>
          ) : null}
        </div>

        <aside id="intake" className="scroll-mt-[124px] lg:sticky lg:top-[124px]">
          <LeadForm
            variant="compact"
            defaultPracticeArea={area.slug}
            headline={`Tell us about your ${area.nounSingular}`}
            description="Free consultation. We'll call you back within one business hour during office hours."
          />
        </aside>
      </article>

      {cityLinks.length > 0 ? (
        <section className="bg-background border-line border-t">
          <div className="container-page py-[clamp(48px,7vw,72px)]">
            <h2 className="text-display-sm font-semibold">{area.name} representation by city</h2>
            <p className="text-stone mt-3 max-w-2xl">
              We handle {area.nounSingular} cases across California. Explore the
              cities where we&apos;ve detailed our local experience:
            </p>
            <ul className="m-0 mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {cityLinks.map((p) => (
                <li key={`${p.county_slug}/${p.city_slug}`}>
                  <Link
                    href={`/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
                    className="group bg-card border-line hover:border-gold text-foreground flex items-center justify-between gap-3 rounded-xl border px-4 py-3 no-underline transition-colors"
                  >
                    <span className="font-medium">
                      {p.city_name} {area.shortName}
                    </span>
                    <ArrowRight className="text-stone group-hover:text-gold-deep h-4 w-4 transition-colors" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <RelatedPracticeAreas id="related" currentSlug={area.slug} max={4} />

      <CtaBand
        heading={area.ctaHeading ?? `Injured in a ${area.nounSingular}?`}
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
