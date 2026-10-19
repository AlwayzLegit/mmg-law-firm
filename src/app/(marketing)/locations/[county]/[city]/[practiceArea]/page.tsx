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
import { IntroEmphasis } from "@/components/marketing/intro-emphasis";
import { PracticeChecklistText } from "@/components/marketing/practice-checklist-text";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button-variants";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { findPracticeArea, lawyerPhraseTitle } from "@/lib/data/practice-areas";
import {
  PRACTICE_AREA_CONTENT,
  getAttorneyHelp,
} from "@/lib/data/practice-area-content";
import { AttorneyHelpSection } from "@/components/marketing/attorney-help-section";
import { getLocationPage, getPublishedLocationPages } from "@/lib/data/queries";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, buildService } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";
import { practiceGuides } from "@/lib/v3/practice-guides";

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

// Exact route titles approved by the owner on October 18, 2026.
const approvedLocationTitles: Record<string, string> = {
  "/locations/san-diego-county/san-diego/rideshare-accidents": "San Diego Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/los-angeles/rideshare-accidents": "Los Angeles Uber & Lyft Accident Lawyer",
  "/locations/kern-county/bakersfield/rideshare-accidents": "Bakersfield Uber & Lyft Accident Lawyer",
  "/locations/orange-county/santa-ana/rideshare-accidents": "Santa Ana Uber & Lyft Accident Lawyer",
  "/locations/san-bernardino-county/san-bernardino/rideshare-accidents": "San Bernardino Uber & Lyft Accident Lawyer",
  "/locations/riverside-county/riverside/rideshare-accidents": "Riverside Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/long-beach/rideshare-accidents": "Long Beach Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/pasadena/rideshare-accidents": "Pasadena Uber & Lyft Accident Lawyer",
  "/locations/sacramento-county/sacramento/rideshare-accidents": "Sacramento Uber & Lyft Accident Lawyer",
  "/locations/san-francisco-county/san-francisco/rideshare-accidents": "San Francisco Uber & Lyft Accident Lawyer",
  "/locations/santa-clara-county/san-jose/rideshare-accidents": "San Jose Uber & Lyft Accident Lawyer",
  "/locations/orange-county/anaheim/rideshare-accidents": "Anaheim Uber & Lyft Accident Lawyer",
  "/locations/fresno-county/fresno/rideshare-accidents": "Fresno Uber & Lyft Accident Lawyer",
  "/locations/orange-county/santa-ana/workplace-discrimination": "Santa Ana Workplace Discrimination Lawyer",
  "/locations/alameda-county/oakland/rideshare-accidents": "Oakland Uber & Lyft Accident Lawyer",
  "/locations/orange-county/irvine/rideshare-accidents": "Irvine Uber & Lyft Accident Lawyer",
  "/locations/san-diego-county/san-diego/workplace-discrimination": "San Diego Workplace Discrimination Lawyer",
  "/locations/los-angeles-county/los-angeles/workplace-discrimination": "Los Angeles Workplace Discrimination Lawyer",
  "/locations/los-angeles-county/beverly-hills/rideshare-accidents": "Beverly Hills Uber & Lyft Accident Lawyer",
  "/locations/santa-barbara-county/santa-barbara/rideshare-accidents": "Santa Barbara Uber & Lyft Accident Lawyer",
  "/locations/stanislaus-county/modesto/rideshare-accidents": "Modesto Uber & Lyft Accident Lawyer",
  "/locations/san-luis-obispo-county/san-luis-obispo/rideshare-accidents": "San Luis Obispo Uber & Lyft Accident Lawyer",
  "/locations/sonoma-county/santa-rosa/rideshare-accidents": "Santa Rosa Uber & Lyft Accident Lawyer",
  "/locations/san-joaquin-county/stockton/rideshare-accidents": "Stockton Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/pasadena/workplace-discrimination": "Pasadena Workplace Discrimination Lawyer",
  "/locations/butte-county/chico/rideshare-accidents": "Chico Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/burbank/rideshare-accidents": "Burbank Uber & Lyft Accident Lawyer",
  "/locations/shasta-county/redding/rideshare-accidents": "Redding Uber & Lyft Accident Lawyer",
  "/locations/santa-cruz-county/santa-cruz/rideshare-accidents": "Santa Cruz Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/santa-monica/rideshare-accidents": "Santa Monica Uber & Lyft Accident Lawyer",
  "/locations/ventura-county/ventura/rideshare-accidents": "Ventura Uber & Lyft Accident Lawyer",
  "/locations/tulare-county/visalia/rideshare-accidents": "Visalia Uber & Lyft Accident Lawyer",
  "/locations/merced-county/merced/rideshare-accidents": "Merced Uber & Lyft Accident Lawyer",
  "/locations/imperial-county/el-centro/rideshare-accidents": "El Centro Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/long-beach/workplace-discrimination": "Long Beach Workplace Discrimination Lawyer",
  "/locations/el-dorado-county/south-lake-tahoe/rideshare-accidents": "South Lake Tahoe Uber & Lyft Accident Lawyer",
  "/locations/santa-clara-county/san-jose/workplace-discrimination": "San Jose Workplace Discrimination Attorney",
  "/locations/sonoma-county/santa-rosa/dog-bites": "Santa Rosa Dog Bite Attorney",
  "/locations/san-mateo-county/san-mateo/dog-bites": "San Mateo Dog Bite Attorney",
  "/locations/san-mateo-county/san-mateo/rideshare-accidents": "San Mateo Uber & Lyft Accident Attorney",
  "/locations/san-luis-obispo-county/san-luis-obispo/motorcycle-accidents": "San Luis Obispo Motorcycle Accident Attorney",
  "/locations/sutter-county/yuba-city/truck-accidents": "Yuba City Truck Accident Attorney",
  "/locations/humboldt-county/eureka/rideshare-accidents": "Eureka Uber & Lyft Accident Lawyer",
  "/locations/monterey-county/salinas/rideshare-accidents": "Salinas Uber & Lyft Accident Lawyer",
  "/locations/marin-county/san-rafael/slip-and-fall": "San Rafael Slip and Fall Attorney",
  "/locations/los-angeles-county/burbank/workplace-discrimination": "Burbank Workplace Discrimination Lawyer",
  "/locations/placer-county/roseville/rideshare-accidents": "Roseville Uber & Lyft Accident Lawyer",
  "/locations/sutter-county/yuba-city/rideshare-accidents": "Yuba City Uber & Lyft Accident Lawyer",
  "/locations/kings-county/hanford/rideshare-accidents": "Hanford Uber & Lyft Accident Lawyer",
  "/locations/solano-county/vallejo/rideshare-accidents": "Vallejo Uber & Lyft Accident Lawyer",
  "/locations/marin-county/san-rafael/rideshare-accidents": "San Rafael Uber & Lyft Accident Lawyer",
  "/locations/sonoma-county/santa-rosa/slip-and-fall": "Santa Rosa Slip and Fall Attorney",
  "/locations/los-angeles-county/glendale/rideshare-accidents": "Glendale Uber & Lyft Accident Lawyer",
  "/locations/madera-county/madera/rideshare-accidents": "Madera Uber & Lyft Accident Lawyer",
  "/locations/san-benito-county/hollister/rideshare-accidents": "Hollister Uber & Lyft Accident Lawyer",
  "/locations/napa-county/napa/rideshare-accidents": "Napa Uber & Lyft Accident Lawyer",
  "/locations/nevada-county/grass-valley/rideshare-accidents": "Grass Valley Uber & Lyft Accident Lawyer",
  "/locations/lake-county/clearlake/rideshare-accidents": "Clearlake Uber & Lyft Accident Lawyer",
  "/locations/yuba-county/marysville/rideshare-accidents": "Marysville Uber & Lyft Accident Lawyer",
  "/locations/yolo-county/davis/rideshare-accidents": "Davis Uber & Lyft Accident Lawyer",
  "/locations/contra-costa-county/richmond/rideshare-accidents": "Richmond Uber & Lyft Accident Lawyer",
  "/locations/mendocino-county/ukiah/rideshare-accidents": "Ukiah Uber & Lyft Accident Lawyer",
  "/locations/los-angeles-county/glendale/workplace-discrimination": "Glendale Workplace Discrimination Lawyer",
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
    title: approvedLocationTitles[`/locations/${county}/${city}/${practiceArea}`] ?? `${row.city_name} ${metaPhrase}`,
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
  const otherCaliforniaCities = [
    ...samePractice.filter((p) => p.county_slug === row.county_slug),
    ...samePractice.filter((p) => p.county_slug !== row.county_slug),
  ].slice(0, 6);

  const legalService = buildService({
    path,
    name: `${FIRM.legalName} — ${row.practice_area_name} in ${row.city_name}`,
    areaServed: { "@type": "City", name: row.city_name },
    serviceType: area?.lawyerPhrase ?? row.practice_area_name,
  });

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
        description={row.intro_md ? <IntroEmphasis text={row.intro_md} /> : undefined}
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

            {practiceGuides(row.practice_area_slug).length > 0 ? (
              <section className="mt-12" aria-labelledby="related-guides-heading">
                <h2 id="related-guides-heading" className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  Related California accident guides
                </h2>
                <ul className="mt-4 space-y-2">
                  {practiceGuides(row.practice_area_slug).map((guide) => (
                    <li key={guide.path}>
                      <Link href={guide.path} className="text-primary underline underline-offset-4">
                        {guide.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <AttorneyHelpSection
              practiceLabel={
                area?.name.toLowerCase() ??
                row.practice_area_name.toLowerCase()
              }
              body={getAttorneyHelp(
                row.practice_area_slug,
                area?.nounSingular ?? row.practice_area_name.toLowerCase(),
              )}
            />

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
                      <span className="text-foreground"><PracticeChecklistText text={line} /></span>
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

            {otherCaliforniaCities.length > 0 ? (
              <section className="border-border mt-12 border-t pt-8">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  {row.practice_area_name} in other California cities
                </h2>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {otherCaliforniaCities.map((p) => (
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

          <aside>
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
        body="Free consultation. Bilingual counsel. No recovery, no attorney fees or case expenses."
      />
    </>
  );
}
