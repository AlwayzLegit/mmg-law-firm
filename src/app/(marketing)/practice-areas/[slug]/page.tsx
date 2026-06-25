import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { CaseResultCard } from "@/components/marketing/case-result-card";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { RelatedPracticeAreas } from "@/components/marketing/related-practice-areas";
import { SubjectImage } from "@/components/marketing/subject-image";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { PRACTICE_AREA_IMAGE, pickLocationImage } from "@/lib/media";
import {
  PRACTICE_AREAS,
  findPracticeArea,
  lawyerPhraseTitle,
} from "@/lib/data/practice-areas";
import { getPracticeAreaContent } from "@/lib/data/practice-area-queries";
import { getPublishedLocationPages } from "@/lib/data/queries";
import { getCaseResultsForPracticeArea } from "@/lib/data/public-content";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage } from "@/lib/seo/schema";
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
    // `knowsAbout` (valid on Organization/LegalService) carries the topical
    // signal; `serviceType` is only valid on schema.org Service and was
    // flagged NOT_RECOGNIZED in the site audit.
    knowsAbout: area.lawyerPhrase,
  };

  const faqGraph = content.faqs.length > 0 ? buildFaqPage(content.faqs) : null;

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
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Practice Areas", href: "/practice-areas" },
          { label: area.name },
        ]}
        title={`California ${lawyerPhraseTitle(area)}`}
        description={content.intro}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className={cn(buttonVariants({ size: "marketing" }), "group/cta")}
            >
              <span>Free consultation</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
                aria-hidden
              />
            </Link>
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "marketing" }),
              )}
            >
              Call {FIRM.phone}
            </a>
          </div>
        }
        aside={
          <AttorneyHeroAside
            image={pickLocationImage(slug).name}
            alt={pickLocationImage(slug).alt}
            priority
          />
        }
      />

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="prose-area">
            {PRACTICE_AREA_IMAGE[slug] ? (
              <SubjectImage
                image={PRACTICE_AREA_IMAGE[slug]}
                alt={`${area.name} representation in California`}
                className="mb-10"
              />
            ) : null}

            {content.body_from_db ? (
              <div className="prose prose-neutral text-muted-foreground prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content.body_md}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg leading-relaxed">
                {content.body_md || content.intro}
              </p>
            )}

            {content.subtopics.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  What we handle
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {content.subtopics.map((s) => (
                    <div
                      key={s.title}
                      className="border-border bg-card rounded-xl border p-6"
                    >
                      <h3 className="font-display text-base font-medium">
                        {s.title}
                      </h3>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {s.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {content.process.length > 0 ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  How we work
                </h2>
                <ol className="mt-6 space-y-5">
                  {content.process.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="bg-primary/10 font-display text-primary mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-medium">
                          {step.title}
                        </h3>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {content.whatToDo.length > 0 ? (
              <section className="border-border bg-secondary/40 mt-12 rounded-2xl border p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  What to do right away
                </h2>
                <ul className="mt-6 space-y-3">
                  {content.whatToDo.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm">
                      <CheckCircle2
                        className="text-primary mt-0.5 h-4 w-4 flex-none"
                        aria-hidden
                      />
                      <span className="text-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-6 text-xs">
                  {DISCLAIMERS.general}
                </p>
              </section>
            ) : null}

            {inlineResults.length > 0 ? (
              <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                    Recent {area.shortName.toLowerCase()} results
                  </h2>
                  <Link
                    href="/case-results"
                    className="group/link text-primary inline-flex items-center gap-1.5 text-sm font-medium"
                  >
                    <span className="underline-offset-4 group-hover/link:underline">
                      View all results
                    </span>
                    <span className="transition-transform group-hover/link:translate-x-0.5">
                      &rarr;
                    </span>
                  </Link>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {inlineResults.map((r) => (
                    <CaseResultCard key={r.id} result={r} />
                  ))}
                </div>
                <p className="text-muted-foreground mt-4 text-xs">
                  {DISCLAIMERS.results}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              defaultPracticeArea={area.slug}
              headline={`Tell us about your ${area.nounSingular}`}
              description="Free consultation. We'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      {cityLinks.length > 0 ? (
        <section className="border-border bg-secondary/30 border-t">
          <div className="container-page py-16 md:py-20">
            <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              {area.name} representation by city
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              We handle {area.nounSingular} cases across California. Explore the
              cities where we&apos;ve detailed our local experience:
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cityLinks.map((p) => (
                <li key={`${p.county_slug}/${p.city_slug}`}>
                  <Link
                    href={`/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
                    className="group border-border bg-card hover:border-primary/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                  >
                    <span className="font-medium">
                      {p.city_name} {area.shortName}
                    </span>
                    <ArrowRight
                      className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {content.faqs.length > 0 ? (
        <Faq items={content.faqs} heading={`${area.shortName} FAQ`} />
      ) : null}

      <RelatedPracticeAreas currentSlug={area.slug} max={4} />

      <CtaBand
        heading={`Injured in a ${area.nounSingular}?`}
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
