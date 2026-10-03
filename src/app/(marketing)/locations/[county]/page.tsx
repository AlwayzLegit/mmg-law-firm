import { notFound } from "next/navigation";
import { Clock, Languages, MapPin } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { DeadlinesCallout } from "@/components/marketing/deadlines-callout";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { CourtInfo } from "@/components/marketing/locations/court-info";
import { LinkCards } from "@/components/marketing/locations/link-cards";
import { LocalStats } from "@/components/marketing/locations/local-stats";
import { LocationHero } from "@/components/marketing/locations/location-hero";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { localFaqItems } from "@/lib/data/local-faq";
import {
  getCountyBySlug,
  getCitiesInCounty,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";

export const dynamicParams = true;
export const revalidate = 86400;

export async function generateStaticParams() {
  const counties = await getPublishedCounties();
  return counties.map((c) => ({ county: c.slug }));
}

type Props = { params: Promise<{ county: string }> };

export async function generateMetadata({ params }: Props) {
  const { county } = await params;
  const c = await getCountyBySlug(county);
  if (!c) {
    return buildMetadata({
      title: "County not found",
      description: "We couldn't find this county.",
      path: `/locations/${county}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `${c.name} Personal Injury Lawyer`,
    description:
      c.meta_description ??
      `${FIRM.legalName} represents ${c.name} clients in personal-injury matters. Free consultation. Bilingual representation.`,
    path: `/locations/${c.slug}`,
    image: null, // per-page opengraph-image.tsx
  });
}

export default async function CountyPage({ params }: Props) {
  const { county } = await params;
  const c = await getCountyBySlug(county);
  if (!c) notFound();

  const [cities, allLocationPages] = await Promise.all([
    getCitiesInCounty(c.slug),
    getPublishedLocationPages(),
  ]);
  const countyLocationPages = allLocationPages.filter((p) => p.county_slug === c.slug);
  const path = `/locations/${c.slug}`;

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
    areaServed: { "@type": "AdministrativeArea", name: c.name },
    parentOrganization: { "@id": FIRM_LEGAL_SERVICE_ID },
  };

  const faqItems = localFaqItems({ place: c.name });
  const faqGraph = buildFaqPage(faqItems);

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name: c.name, path },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(legalService) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqGraph) }} />

      <LocationHero
        path={county}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Locations", href: "/locations" },
          { label: c.name },
        ]}
        eyebrow={`Attorney Advertising · ${c.name}`}
        titleA={c.name}
        titleB="Personal Injury Lawyer"
        description={
          c.intro_md ??
          `${FIRM.legalName} represents ${c.name} clients across the full range of personal-injury matters. Free consultation. Bilingual counsel. No fee unless we win your case.`
        }
        facts={[
          ...(c.seat ? [{ icon: MapPin, k: "County seat:", v: c.seat }] : []),
          { icon: Clock, k: "Deadline:", v: "2 years for most claims" },
          { icon: Languages, k: "Counsel in", v: FIRM.languages.join(" · ") },
        ]}
      />

      <article className="container-page grid items-start gap-12 pt-[clamp(40px,6vw,64px)] pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="grid min-w-0 gap-12">
          <section>
            <h2 className="text-display-sm font-semibold">Cities we cover in {c.name}</h2>
            {cities.length === 0 ? (
              <p className="text-stone mt-4">
                We work throughout {c.name}. Call us to confirm we can take your matter where you live.
              </p>
            ) : (
              <LinkCards
                pin
                min={200}
                className="mt-5"
                items={cities.map((city) => ({ href: `/locations/${c.slug}/${city.slug}`, label: city.name }))}
              />
            )}
          </section>

          {c.local_stats_md ? <LocalStats place={c.name} body={c.local_stats_md} /> : null}

          {c.seat ? <CourtInfo county={c.name} seat={c.seat} address={c.superior_court_address} /> : null}

          <DeadlinesCallout />

          {countyLocationPages.length > 0 ? (
            <section>
              <h2 className="text-display-xs font-semibold">Local practice-area pages in {c.short_name}</h2>
              <LinkCards
                className="mt-[18px]"
                items={countyLocationPages.map((p) => ({
                  href: `/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`,
                  label: `${p.city_name} ${p.practice_area_name}`,
                }))}
              />
            </section>
          ) : null}
        </div>

        <aside id="intake" className="scroll-mt-[124px] lg:sticky lg:top-[124px]">
          <LeadForm
            variant="compact"
            defaultCountySlug={c.slug}
            headline={`Tell us about your matter in ${c.short_name}`}
            description="Free consultation. We'll call you back within one business hour during office hours."
          />
        </aside>
      </article>

      <PracticeAreaGrid
        className="surface-paper-2 border-line border-t"
        heading={`Practice areas in ${c.short_name}`}
        subheading="What we handle for clients across the county."
      />

      <Faq items={faqItems} heading={`${c.name} Personal Injury FAQ`} />

      <CtaBand eyebrow={`Injured in ${c.short_name}?`} />
    </>
  );
}
