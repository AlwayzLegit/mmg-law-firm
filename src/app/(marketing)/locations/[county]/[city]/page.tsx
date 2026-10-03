import { notFound } from "next/navigation";

import { CtaBand } from "@/components/marketing/cta-band";
import { DeadlinesCallout } from "@/components/marketing/deadlines-callout";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { LocalStats } from "@/components/marketing/locations/local-stats";
import { LocationHero } from "@/components/marketing/locations/location-hero";
import { PracticeAreaRows } from "@/components/marketing/locations/practice-area-rows";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { localFaqItems } from "@/lib/data/local-faq";
import {
  getAllPublishedCities,
  getCityBySlug,
  getPublishedPracticeSlugsForCity,
} from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  const cities = await getAllPublishedCities();
  return cities.map((c) => ({ county: c.county_slug, city: c.slug }));
}

type Props = { params: Promise<{ county: string; city: string }> };

export async function generateMetadata({ params }: Props) {
  const { county, city } = await params;
  const c = await getCityBySlug(county, city);
  if (!c) {
    return buildMetadata({
      title: "City not found",
      description: "We couldn't find this city.",
      path: `/locations/${county}/${city}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${c.name} Personal Injury Lawyer`,
    description:
      c.meta_description ??
      `${FIRM.legalName} represents ${c.name} clients in personal-injury matters across ${c.county_name}. Free consultation. Bilingual counsel.`,
    path: `/locations/${c.county_slug}/${c.slug}`,
    image: null, // per-page opengraph-image.tsx
  });
}

export default async function CityPage({ params }: Props) {
  const { county, city } = await params;
  const c = await getCityBySlug(county, city);
  if (!c) notFound();

  const publishedPracticeSlugs = await getPublishedPracticeSlugsForCity(c.county_slug, c.slug);

  const path = `/locations/${c.county_slug}/${c.slug}`;

  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${canonicalUrl(path)}#legal-service`,
    name: `${FIRM.legalName} — ${c.name}`,
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
    areaServed: { "@type": "City", name: c.name },
    parentOrganization: { "@id": FIRM_LEGAL_SERVICE_ID },
  };

  const faqItems = localFaqItems({ place: c.name, countyName: c.county_name });
  const faqGraph = buildFaqPage(faqItems);

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name: c.county_name, path: `/locations/${c.county_slug}` },
          { name: c.name, path },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(legalService) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqGraph) }} />

      <LocationHero
        path={`${county}/${city}`}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Locations", href: "/locations" },
          { label: c.county_name, href: `/locations/${c.county_slug}` },
          { label: c.name },
        ]}
        eyebrow={`Attorney Advertising · ${c.name}`}
        titleA={c.name}
        titleB="Personal Injury Lawyer"
        description={
          c.intro_md ??
          // Fallback used when the attorney hasn't written city-specific
          // intro copy yet. We still want the page to feel less like a
          // template — pull in the Glendale-office framing and the
          // languages we work in. The page is structurally useful as a
          // navigation hub even before per-city copy lands.
          `From our Glendale office, ${FIRM.legalName} represents ${c.name} clients across ${c.county_name} — auto, motorcycle and bike crashes, slip-and-fall, dog bites, wrongful death, and California employment matters. Free consultation in ${FIRM.languages.join(", ")}.`
        }
      />

      <article className="container-page grid items-start gap-12 pt-[clamp(40px,6vw,64px)] pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="grid min-w-0 gap-12">
          <section>
            <h2 className="text-display-sm font-semibold">Practice areas we handle in {c.name}</h2>
            <p className="text-stone mt-2.5 text-[15.5px]">
              Click any matter type for a detailed look — or call us directly
              if you&apos;re not sure where your situation fits.
            </p>
            <PracticeAreaRows
              className="mt-5"
              localSlugs={publishedPracticeSlugs}
              // Prefer the city × practice page when the attorney has
              // published unique copy for that combo. Otherwise fall back
              // to the always-available practice-area hub — never link
              // to a route that would 404.
              hrefFor={(slug) =>
                publishedPracticeSlugs.has(slug) ? `/locations/${c.county_slug}/${c.slug}/${slug}` : `/practice-areas/${slug}`
              }
            />
          </section>

          {c.local_stats_md ? <LocalStats place={c.name} body={c.local_stats_md} /> : null}

          <DeadlinesCallout />
        </div>

        <aside id="intake" className="scroll-mt-[124px] lg:sticky lg:top-[124px]">
          <LeadForm
            variant="compact"
            defaultCountySlug={c.county_slug}
            defaultCitySlug={c.slug}
            headline={`Tell us what happened in ${c.name}`}
            description="Free consultation. We'll call you back within one business hour during office hours."
          />
        </aside>
      </article>

      <Faq items={faqItems} heading={`${c.name} Personal Injury FAQ`} />

      <CtaBand eyebrow={`Injured in ${c.name}?`} />
    </>
  );
}
