import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import {
  getAllPublishedCities,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { pickLocationImage } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Locations We Serve",
  description:
    "MMG Law Firm represents personal-injury clients across California. Browse the counties and cities we cover, all from our Glendale office.",
  path: "/locations",
});

export const revalidate = 86400;

export default async function LocationsHubPage() {
  const [counties, cities, locationPages] = await Promise.all([
    getPublishedCounties(),
    getAllPublishedCities(),
    getPublishedLocationPages(),
  ]);
  const grouped = groupByRegion(counties);
  const citiesByCounty = groupCitiesByCounty(cities);

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
        ]}
      />

      <PageHero
        eyebrow="Locations"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Locations" }]}
        title={
          <>
            California, <span className="text-primary">end to end.</span>
          </>
        }
        description="We work statewide from our Glendale office. Below are the counties and cities where we're most active. If you don't see yours, call us — we likely cover it too."
        aside={
          <AttorneyHeroAside
            image={pickLocationImage("locations").name}
            alt={pickLocationImage("locations").alt}
            priority
          />
        }
      />

      <section className="container-page py-16 md:py-20">
        {Object.keys(grouped).length === 0 ? (
          <div className="border-border bg-secondary/30 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-muted-foreground">
              Counties will appear here once they&apos;re published in admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(grouped).map(([region, items]) => (
              <div key={region}>
                <h2 className="font-display text-muted-foreground text-base font-medium tracking-wide uppercase">
                  {region}
                </h2>
                <ul className="mt-4 space-y-2">
                  {items.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/locations/${c.slug}`}
                        className="hover:bg-secondary hover:text-primary focus-visible:ring-ring block rounded-md px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {cities.length > 0 ? (
        <section className="border-border bg-secondary/20 border-t">
          <div className="container-page py-16 md:py-20">
            <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              Cities we serve
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              We represent injured clients across these California cities, all
              from our Glendale office. Don&apos;t see yours? Call us — we likely
              cover it.
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(citiesByCounty).map(([countyName, items]) => (
                <div key={countyName}>
                  <h3 className="font-display text-muted-foreground text-sm font-medium tracking-wide uppercase">
                    {countyName}
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {items.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/locations/${c.county_slug}/${c.slug}`}
                          className="hover:text-primary text-sm transition-colors"
                        >
                          {c.name} Personal Injury Lawyer
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {locationPages.length > 0 ? (
        <section className="container-page py-16 md:py-20">
          <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
            Local practice-area guides
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            City-specific pages for the cases we handle most — written for the
            way these claims actually play out locally.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locationPages.map((p) => (
              <li
                key={`${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
              >
                <Link
                  href={`/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
                  className="group border-border bg-card hover:border-primary/30 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {p.city_name} {p.practice_area_name}
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

      <CtaBand />
    </>
  );
}

function groupByRegion<T extends { region: string | null }>(
  items: T[],
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const key = item.region ?? "Other";
    (out[key] ??= []).push(item);
  }
  for (const key of Object.keys(out)) {
    out[key]!.sort((a, b) => {
      const an = (a as unknown as { name: string }).name;
      const bn = (b as unknown as { name: string }).name;
      return an.localeCompare(bn);
    });
  }
  return out;
}

function groupCitiesByCounty<
  T extends { county_name: string; name: string },
>(cities: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const c of cities) (out[c.county_name] ??= []).push(c);
  for (const key of Object.keys(out)) {
    out[key]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}
