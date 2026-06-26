import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { CompensationSection } from "@/components/marketing/compensation-section";
import { CtaBand } from "@/components/marketing/cta-band";
import { DeadlinesCallout } from "@/components/marketing/deadlines-callout";
import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { findPracticeArea, lawyerPhraseTitle } from "@/lib/data/practice-areas";
import { PRACTICE_AREA_CONTENT } from "@/lib/data/practice-area-content";
import { getLocationPage, getPublishedLocationPages } from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";

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
    (p) =>
      p.practice_area_slug === row.practice_area_slug &&
      p.city_slug !== row.city_slug,
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

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name: row.county_name, path: `/locations/${row.county_slug}` },
          {
            name: row.city_name,
            path: `/locations/${row.county_slug}/${row.city_slug}`,
          },
          { name: row.practice_area_name, path },
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
          { label: "Locations", href: "/locations" },
          { label: row.county_name, href: `/locations/${row.county_slug}` },
          {
            label: row.city_name,
            href: `/locations/${row.county_slug}/${row.city_slug}`,
          },
          { label: row.practice_area_name },
        ]}
        title={`${row.city_name} ${area ? lawyerPhraseTitle(area) : row.practice_area_name}`}
        description={row.intro_md ?? undefined}
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
            image={pickLocationImage(path).name}
            alt={pickLocationImage(path).alt}
            priority
          />
        }
      />

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                {row.practice_area_name} matters in {row.city_name}
              </h2>
              {/* Rendered as Markdown so deepened pages can use H2/H3 section
                  headings and lists. Plain-paragraph rows (the default local
                  copy) render identically as <p> elements. */}
              <div className="prose prose-neutral text-muted-foreground prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-10 prose-h3:text-base mt-4 max-w-none leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {row.local_angle_md}
                </ReactMarkdown>
              </div>
            </section>

            {content?.subtopics?.length ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  Types of{" "}
                  {area?.nounPlural ?? row.practice_area_name.toLowerCase()} we
                  handle
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {content.subtopics.map((s) => (
                    <div
                      key={s.title}
                      className="border-border bg-card rounded-2xl border p-5"
                    >
                      <h3 className="font-display text-base font-medium tracking-tight">
                        {s.title}
                      </h3>
                      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <CompensationSection
              nounSingular={area?.nounSingular}
              category={area?.category}
            />

            {content?.process?.length ? (
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

            {content?.whatToDo?.length ? (
              <section className="border-border bg-secondary/40 mt-12 rounded-2xl border p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight">
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

            <DeadlinesCallout category={area?.category} />

            {siblings.length > 0 ? (
              <section className="border-border mt-12 border-t pt-8">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  More practice areas in {row.city_name}
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {siblings.map((s) => (
                    <li key={s.practice_area_slug}>
                      <Link
                        href={`/locations/${s.county_slug}/${s.city_slug}/${s.practice_area_slug}`}
                        className="group border-border bg-card hover:border-primary/40 flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors"
                      >
                        <span>
                          {s.practice_area_name} in {s.city_name}
                        </span>
                        <ArrowRight
                          className="text-muted-foreground group-hover:text-primary h-4 w-4 flex-none transition-colors"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {nearbyCities.length > 0 ? (
              <section className="border-border mt-12 border-t pt-8">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  {row.practice_area_name} in nearby cities
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {nearbyCities.map((p) => (
                    <li key={`${p.county_slug}/${p.city_slug}`}>
                      <Link
                        href={`/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
                        className="group border-border bg-card hover:border-primary/40 flex items-center justify-between rounded-xl border p-4 text-sm font-medium transition-colors"
                      >
                        <span>
                          {p.practice_area_name} in {p.city_name}
                        </span>
                        <ArrowRight
                          className="text-muted-foreground group-hover:text-primary h-4 w-4 flex-none transition-colors"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              defaultCountySlug={row.county_slug}
              defaultCitySlug={row.city_slug}
              defaultPracticeArea={row.practice_area_slug}
              headline={`Tell us about your ${area?.nounSingular ?? row.practice_area_name.toLowerCase()} in ${row.city_name}`}
              description="Free consultation. We'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      {row.faq_json?.length ? (
        <Faq
          items={row.faq_json}
          heading={`${row.city_name} ${row.practice_area_name} FAQ`}
        />
      ) : content?.faqs?.length ? (
        <Faq items={content.faqs} heading={`${row.practice_area_name} FAQ`} />
      ) : null}

      <CtaBand
        heading={
          area?.category === "employment"
            ? `Mistreated at work in ${row.city_name}?`
            : `Injured in ${row.city_name}?`
        }
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
