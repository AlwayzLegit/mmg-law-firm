import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AttorneyHelpSection } from "@/components/marketing/attorney-help-section";
import { CompensationSection } from "@/components/marketing/compensation-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { DeadlinesCallout } from "@/components/marketing/deadlines-callout";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { LinkCards } from "@/components/marketing/locations/link-cards";
import { LocationHero } from "@/components/marketing/locations/location-hero";
import { ProcessTimeline } from "@/components/marketing/practice/process-timeline";
import { SubtopicCards } from "@/components/marketing/practice/subtopic-cards";
import { WhatToDoPanel } from "@/components/marketing/practice/what-to-do";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { findPracticeArea, lawyerPhraseTitle } from "@/lib/data/practice-areas";
import {
  PRACTICE_AREA_CONTENT,
  getAttorneyHelp,
} from "@/lib/data/practice-area-content";
import { getLocationPage, getPublishedLocationPages } from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";

// Spec §17 hard rule #1: city × practice pages require unique local_angle_md
// to publish. We never auto-generate filler. dynamicParams=true so a freshly
// published row in admin starts rendering on demand.
export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  const rows = await getPublishedLocationPages();
  return rows.map((r) => ({
    county: r.county_slug,
    city: r.city_slug,
    practiceArea: r.practice_area_slug,
  }));
}

type Props = {
  params: Promise<{ county: string; city: string; practiceArea: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { county, city, practiceArea } = await params;
  const row = await getLocationPage(county, city, practiceArea);
  if (!row) {
    return buildMetadata({
      title: "Page not found",
      description: "We couldn't find this page.",
      path: `/locations/${county}/${city}/${practiceArea}`,
      noindex: true,
    });
  }
  const metaArea = findPracticeArea(row.practice_area_slug);
  const metaPhrase = metaArea
    ? lawyerPhraseTitle(metaArea)
    : row.practice_area_name;
  return buildMetadata({
    title: `${row.city_name} ${metaPhrase}`,
    description:
      row.meta_description ??
      `${FIRM.legalName} handles ${row.practice_area_name.toLowerCase()} matters for ${row.city_name} clients. Free consultation. Bilingual representation.`,
    path: `/locations/${row.county_slug}/${row.city_slug}/${row.practice_area_slug}`,
    image: null, // per-page opengraph-image.tsx
  });
}

export default async function CityPracticePage({ params }: Props) {
  const { county, city, practiceArea } = await params;

  // Authoritative check: only render when the DB has a published row with
  // a non-empty local_angle_md. No `local_angle_md` ⇒ 404.
  const row = await getLocationPage(county, city, practiceArea);
  if (!row || !row.local_angle_md || !row.local_angle_md.trim()) {
    notFound();
  }

  const area = findPracticeArea(practiceArea);
  const content = area ? PRACTICE_AREA_CONTENT[area.slug] : undefined;
  const path = `/locations/${row.county_slug}/${row.city_slug}/${row.practice_area_slug}`;
  const isEmployment = area?.category === "employment";

  // Sibling practice-area pages in the same city. Cross-linking them gives each
  // money page more than one internal inbound link (a low-internal-links notice
  // in the site audit) and helps users move between local practice pages.
  const allLocationPages = await getPublishedLocationPages();
  const siblings = allLocationPages.filter(
    (p) =>
      p.county_slug === row.county_slug &&
      p.city_slug === row.city_slug &&
      p.practice_area_slug !== row.practice_area_slug,
  );
  // Same practice area in OTHER cities — gives every money page a dense lateral
  // link mesh (most cities currently publish only one practice area, so the
  // same-city "siblings" list is usually empty). Same-county cities first, then
  // the rest of the state; capped at 6.
  const samePractice = allLocationPages.filter(
    (p) => p.practice_area_slug === row.practice_area_slug && p.city_slug !== row.city_slug,
  );
  const nearbyCities = [
    ...samePractice.filter((p) => p.county_slug === row.county_slug),
    ...samePractice.filter((p) => p.county_slug !== row.county_slug),
  ].slice(0, 6);

  const legalService = {
    "@context": "https://schema.org",
    "@type": ["LegalService", "Attorney"],
    "@id": `${canonicalUrl(path)}#legal-service`,
    name: `${FIRM.legalName} — ${row.practice_area_name} in ${row.city_name}`,
    url: canonicalUrl(path),
    image: defaultOgImageUrl(),
    telephone: FIRM.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    areaServed: { "@type": "City", name: row.city_name },
    parentOrganization: { "@id": FIRM_LEGAL_SERVICE_ID },
    // `knowsAbout` is valid on Organization/LegalService; `serviceType` is
    // only valid on schema.org Service (flagged NOT_RECOGNIZED in the audit).
    knowsAbout: area?.lawyerPhrase ?? row.practice_area_name,
  };

  const faqGraph = row.faq_json?.length
    ? buildFaqPage(row.faq_json)
    : content?.faqs?.length
      ? buildFaqPage(content.faqs)
      : null;

  const nounSingular = area?.nounSingular ?? row.practice_area_name.toLowerCase();

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name: row.county_name, path: `/locations/${row.county_slug}` },
          { name: row.city_name, path: `/locations/${row.county_slug}/${row.city_slug}` },
          { name: row.practice_area_name, path },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(legalService) }} />
      {faqGraph ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqGraph) }} />
      ) : null}

      <LocationHero
        path={path}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Locations", href: "/locations" },
          { label: row.county_name, href: `/locations/${row.county_slug}` },
          { label: row.city_name, href: `/locations/${row.county_slug}/${row.city_slug}` },
          { label: row.practice_area_name },
        ]}
        eyebrow={`Attorney Advertising · ${isEmployment ? "Employment law" : "Personal injury"}`}
        titleA={row.city_name}
        titleB={area ? lawyerPhraseTitle(area) : row.practice_area_name}
        description={row.intro_md ?? undefined}
      />

      <article className="container-page grid items-start gap-12 pt-[clamp(40px,6vw,64px)] pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="min-w-0">
          <section>
            <h2 className="text-display-sm font-semibold">
              {row.practice_area_name} matters in {row.city_name}
            </h2>
            {/* Rendered as Markdown so deepened pages can use H2/H3 section
                headings and lists. Plain-paragraph rows (the default local
                copy) render identically as <p> elements. */}
            <div className="prose-v2 mt-3.5 text-[16.5px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{row.local_angle_md}</ReactMarkdown>
            </div>
          </section>

          <AttorneyHelpSection
            practiceLabel={area?.name.toLowerCase() ?? row.practice_area_name.toLowerCase()}
            body={getAttorneyHelp(row.practice_area_slug, nounSingular)}
          />

          {content?.subtopics?.length ? (
            <SubtopicCards
              subtopics={content.subtopics}
              areaIcon={area?.icon ?? "Scale"}
              heading={`Types of ${area?.nounPlural ?? row.practice_area_name.toLowerCase()} we handle`}
            />
          ) : null}

          <CompensationSection nounSingular={area?.nounSingular} category={area?.category} />

          {content?.process?.length ? <ProcessTimeline steps={content.process} /> : null}

          {content?.whatToDo?.length ? <WhatToDoPanel items={content.whatToDo} /> : null}

          <DeadlinesCallout category={area?.category} />

          {siblings.length > 0 ? (
            <section className="mt-14">
              <h2 className="text-display-xs font-semibold">More practice areas in {row.city_name}</h2>
              <LinkCards
                className="mt-[18px]"
                items={siblings.map((s) => ({
                  href: `/locations/${s.county_slug}/${s.city_slug}/${s.practice_area_slug}`,
                  label: `${s.practice_area_name} in ${s.city_name}`,
                }))}
              />
            </section>
          ) : null}

          {nearbyCities.length > 0 ? (
            <section className="mt-14">
              <h2 className="text-display-xs font-semibold">{row.practice_area_name} in nearby cities</h2>
              <LinkCards
                className="mt-[18px]"
                items={nearbyCities.map((p) => ({
                  href: `/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`,
                  label: `${p.practice_area_name} in ${p.city_name}`,
                }))}
              />
            </section>
          ) : null}
        </div>

        <aside id="intake" className="scroll-mt-[124px] lg:sticky lg:top-[124px]">
          <LeadForm
            variant="compact"
            defaultCountySlug={row.county_slug}
            defaultCitySlug={row.city_slug}
            defaultPracticeArea={row.practice_area_slug}
            headline={`Tell us about your ${nounSingular} in ${row.city_name}`}
            description="Free consultation. We'll call you back within one business hour during office hours."
          />
        </aside>
      </article>

      {row.faq_json?.length ? (
        <Faq items={row.faq_json} heading={`${row.city_name} ${row.practice_area_name} FAQ`} />
      ) : content?.faqs?.length ? (
        <Faq items={content.faqs} heading={`${row.practice_area_name} FAQ`} />
      ) : null}

      <CtaBand
        heading={isEmployment ? `Mistreated at work in ${row.city_name}?` : `Injured in ${row.city_name}?`}
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
