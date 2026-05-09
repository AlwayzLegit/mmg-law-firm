import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import {
  getAllPublishedCities,
  getCityBySlug,
} from "@/lib/data/queries";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
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
    title: `${c.name} Personal-Injury Attorney`,
    description:
      c.meta_description ??
      `${FIRM.legalName} represents ${c.name} clients in personal-injury matters across ${c.county_name}. Free consultation. Bilingual counsel.`,
    path: `/locations/${c.county_slug}/${c.slug}`,
  });
}

export default async function CityPage({ params }: Props) {
  const { county, city } = await params;
  const c = await getCityBySlug(county, city);
  if (!c) notFound();

  const path = `/locations/${c.county_slug}/${c.slug}`;

  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: `${FIRM.legalName} — ${c.name}`,
    url: canonicalUrl(path),
    image: `${siteUrl()}/images/og/default.png`,
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(legalService).replace(/</g, "\\u003c"),
        }}
      />

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Attorney Advertising
          </p>
          <nav
            aria-label="Breadcrumb"
            className="mt-3 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <Link href="/locations" className="hover:text-primary">
              Locations
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <Link
              href={`/locations/${c.county_slug}`}
              className="hover:text-primary"
            >
              {c.county_name}
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <span className="text-foreground">{c.name}</span>
          </nav>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            {c.name} Personal-Injury Attorney
          </h1>

          {c.intro_md ? (
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              {c.intro_md}
            </p>
          ) : (
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              {FIRM.legalName} represents {c.name} clients across the full
              range of personal-injury matters in {c.county_name}. Free
              consultation. Bilingual counsel.
              {/* TODO(human): replace with attorney-reviewed city-specific
                  intro stored in cities.intro_md. */}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className={cn(
                buttonVariants({ size: "lg" }),
                "gap-2 px-5 py-3 text-base h-auto",
              )}
            >
              <span>Free consultation</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "px-5 py-3 text-base h-auto",
              )}
            >
              Call {FIRM.phone}
            </a>
          </div>
        </div>
      </section>

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <section>
              <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                Practice areas we handle in {c.name}
              </h2>
              <p className="mt-3 text-muted-foreground">
                Click any matter type for a detailed look — or call us directly
                if you&apos;re not sure where your situation fits.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {PRACTICE_AREAS.sort(
                  (a, b) => a.displayOrder - b.displayOrder,
                ).map((area) => (
                  <li key={area.slug}>
                    <Link
                      href={`/locations/${c.county_slug}/${c.slug}/${area.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30"
                    >
                      <span className="font-medium">{area.name}</span>
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            {c.local_stats_md ? (
              <section className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  About injuries in {c.name}
                </h2>
                <div className="mt-4 whitespace-pre-line text-muted-foreground">
                  {c.local_stats_md}
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
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
