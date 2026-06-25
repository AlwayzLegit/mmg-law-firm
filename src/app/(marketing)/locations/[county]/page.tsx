import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { PracticeAreaGrid } from "@/components/marketing/practice-area-grid";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import {
  getCountyBySlug,
  getCitiesInCounty,
  getPublishedCounties,
} from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

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

  const cities = await getCitiesInCounty(c.slug);
  const path = `/locations/${c.slug}`;

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
    areaServed: { "@type": "AdministrativeArea", name: c.name },
  };

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
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
          { label: c.name },
        ]}
        title={`${c.name} Personal Injury Lawyer`}
        description={
          c.intro_md ??
          `${FIRM.legalName} represents ${c.name} clients across the full range of personal-injury matters. Free consultation. Bilingual counsel. No fee unless we win your case.`
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
            image={pickLocationImage(county).name}
            alt={pickLocationImage(county).alt}
            priority
          />
        }
      />

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Cities we cover in {c.name}
              </h2>
              {cities.length === 0 ? (
                <p className="text-muted-foreground mt-4">
                  We work throughout {c.name}. Call us to confirm we can take
                  your matter where you live.
                </p>
              ) : (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {cities.map((city) => (
                    <li key={city.slug}>
                      <Link
                        href={`/locations/${c.slug}/${city.slug}`}
                        className="group border-border bg-card hover:border-primary/30 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
                      >
                        <MapPin
                          className="text-primary h-4 w-4 flex-none"
                          aria-hidden
                        />
                        <span className="font-medium">{city.name}</span>
                        <ArrowRight
                          className="text-muted-foreground group-hover:text-primary ml-auto h-4 w-4 transition-colors"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
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

            {c.seat ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  Court information
                </h2>
                <p className="text-muted-foreground mt-3">
                  The county seat is {c.seat}. Most {c.name} personal-injury
                  matters are filed in the {c.name} Superior Court.
                </p>
                {c.superior_court_address ? (
                  <address className="border-border bg-card text-muted-foreground mt-4 rounded-lg border p-4 text-sm not-italic">
                    <span className="text-foreground block text-xs font-medium tracking-wide uppercase">
                      {c.name} Superior Court
                    </span>
                    <span className="mt-1 block whitespace-pre-line">
                      {c.superior_court_address}
                    </span>
                  </address>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              defaultCountySlug={c.slug}
              headline={`Tell us about your matter in ${c.short_name}`}
              description="Free consultation. We'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      <PracticeAreaGrid
        heading={`Practice areas in ${c.short_name}`}
        subheading="What we handle for clients across the county."
      />
      <CtaBand />
    </>
  );
}
