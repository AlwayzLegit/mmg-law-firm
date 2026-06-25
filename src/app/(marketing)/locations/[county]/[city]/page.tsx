import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import {
  getAllPublishedCities,
  getCityBySlug,
  getPublishedPracticeSlugsForCity,
} from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

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

  const publishedPracticeSlugs = await getPublishedPracticeSlugsForCity(
    c.county_slug,
    c.slug,
  );

  const path = `/locations/${c.county_slug}/${c.slug}`;

  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
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
  };

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(legalService) }}
      />

      <PageHero
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Locations", href: "/locations" },
          { label: c.county_name, href: `/locations/${c.county_slug}` },
          { label: c.name },
        ]}
        title={`${c.name} Personal Injury Lawyer`}
        description={
          c.intro_md ??
          // Fallback used when the attorney hasn't written city-specific
          // intro copy yet. We still want the page to feel less like a
          // template — pull in the Glendale-office framing and the
          // languages we work in. The page is structurally useful as a
          // navigation hub even before per-city copy lands.
          `From our Glendale office, ${FIRM.legalName} represents ${c.name} clients across ${c.county_name} in personal-injury matters only — auto, motorcycle and bike crashes, slip-and-fall, dog bites, and wrongful death. Free consultation in ${FIRM.languages.join(", ")}.`
        }
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
            image={pickLocationImage(`${county}/${city}`).name}
            alt={pickLocationImage(`${county}/${city}`).alt}
            priority
          />
        }
      />

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Practice areas we handle in {c.name}
              </h2>
              <p className="text-muted-foreground mt-3">
                Click any matter type for a detailed look — or call us directly
                if you&apos;re not sure where your situation fits.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[...PRACTICE_AREAS]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((area) => {
                  // Prefer the city × practice page when the attorney has
                  // published unique copy for that combo. Otherwise fall back
                  // to the always-available practice-area hub — never link
                  // to a route that would 404.
                  const href = publishedPracticeSlugs.has(area.slug)
                    ? `/locations/${c.county_slug}/${c.slug}/${area.slug}`
                    : `/practice-areas/${area.slug}`;
                  return (
                    <li key={area.slug}>
                      <Link
                        href={href}
                        className="group border-border bg-card hover:border-primary/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                      >
                        <span className="font-medium">{area.name}</span>
                        <ArrowUpRight
                          className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            {c.local_stats_md ? (
              <section className="border-border bg-secondary/40 mt-12 rounded-2xl border p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  About injuries in {c.name}
                </h2>
                <div className="text-muted-foreground mt-4 whitespace-pre-line">
                  {c.local_stats_md}
                </div>
                <p className="text-muted-foreground mt-6 text-xs">
                  {DISCLAIMERS.general}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              defaultCountySlug={c.county_slug}
              defaultCitySlug={c.slug}
              headline={`Tell us what happened in ${c.name}`}
              description="Free consultation. We'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      <CtaBand />
    </>
  );
}
