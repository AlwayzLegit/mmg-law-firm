import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { CaliforniaMap } from "@/components/marketing/primitives/california-map";
import { Eyebrow } from "@/components/marketing/primitives/eyebrow";
import { PhotoOrGradient } from "@/components/marketing/primitives/photo-or-gradient";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { findPracticeArea } from "@/lib/data/practice-areas";
import {
  getAllPublishedCities,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { MAP_CITIES } from "@/lib/geo/cities";
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
            California, <em className="em-gold">end to end.</em>
          </>
        }
        description="We work statewide from our Glendale office. Below are the counties and cities where we're most active. If you don't see yours, call us — we likely cover it too."
        aside={
          <div className="border-cream/10 w-full max-w-[460px] rounded-[18px] border bg-[radial-gradient(ellipse_at_50%_40%,rgba(201,163,90,.08),transparent_70%)] p-3 lg:justify-self-end">
            <CaliforniaMap cities={MAP_CITIES} title={`Map of California cities served by ${FIRM.legalName}`} />
          </div>
        }
      />

      <section className="bg-background text-foreground">
        <div className="container-page section-pad-sm">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow>Counties by region</Eyebrow>
              <p className="font-display mt-3 text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">
                Where we&apos;re most active
              </p>
            </div>
            <p className="text-stone max-w-[44ch] text-[15px]">
              Headquartered in {FIRM.address.city}. Pick a county below, or call us to confirm we cover yours.
            </p>
          </div>
          {Object.keys(grouped).length === 0 ? (
            <div className="border-line bg-card mt-8 rounded-2xl border border-dashed p-10 text-center">
              <p className="text-stone">Counties will appear here once they&apos;re published in admin.</p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-3.5">
              {Object.entries(grouped).map(([region, items], idx) => (
                <div key={region} className="bg-card border-line rounded-2xl border p-[22px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-[22px] leading-[1.15] font-semibold tracking-[-0.01em]">{region}</h2>
                    <span className="text-gold-deep text-[11px] tracking-[0.14em]">{String(idx + 1).padStart(2, "0")}</span>
                  </div>
                  <ul className="m-0 mt-3.5 grid list-none gap-1.5 p-0">
                    {items.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/locations/${c.slug}`}
                          className="group bg-paper hover:bg-ink hover:text-cream text-foreground flex items-center justify-between gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-semibold no-underline transition-colors"
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <MapPin className="text-gold-deep group-hover:text-gold h-3.5 w-3.5" aria-hidden />
                            {c.name}
                          </span>
                          <ArrowRight className="text-stone group-hover:text-gold h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {cities.length > 0 ? (
        <section className="surface-paper-2 bg-background text-foreground border-line border-t">
          <div className="container-page section-pad-sm">
            <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">Cities we serve</h2>
            <p className="text-stone mt-3 max-w-[62ch] text-[15.5px]">
              We represent injured clients across these California cities, all
              from our Glendale office. Don&apos;t see yours? Call us — we likely
              cover it.
            </p>
            <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-x-8 gap-y-7">
              {Object.entries(citiesByCounty).map(([countyName, items]) => (
                <div key={countyName}>
                  <h3 className="text-stone border-line-strong m-0 border-b pb-2.5 font-sans text-[11px] leading-none font-semibold tracking-[0.16em] uppercase">
                    {countyName}
                  </h3>
                  <ul className="m-0 mt-2.5 grid list-none gap-1.5 p-0">
                    {items.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/locations/${c.county_slug}/${c.slug}`}
                          className="text-foreground hover:text-gold-deep text-[14.5px] no-underline transition-colors"
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
        <section className="bg-background text-foreground border-line border-t">
          <div className="container-page section-pad-sm">
            <h2 className="text-[clamp(30px,3.6vw,44px)] leading-[1.05] font-semibold tracking-[-0.02em]">
              Local practice-area guides
            </h2>
            <p className="text-stone mt-3 max-w-[62ch] text-[15.5px]">
              City-specific pages for the cases we handle most — written for the
              way these claims actually play out locally.
            </p>
            <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3 p-0">
              {locationPages.map((p) => {
                const area = findPracticeArea(p.practice_area_slug);
                return (
                  <li key={`${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}>
                    <Link
                      href={`/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`}
                      className="bg-card border-line text-foreground hover:shadow-hover flex h-full flex-col overflow-hidden rounded-2xl border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
                    >
                      <span className="bg-ink-soft relative block aspect-video">
                        <PhotoOrGradient
                          slug={p.practice_area_slug}
                          icon={area?.icon ?? "Scale"}
                          alt=""
                          sizes="(min-width: 1024px) 320px, 100vw"
                          loading="lazy"
                        />
                        <span className="bg-ink/70 text-gold absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
                          {p.county_name}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-2.5 px-4 py-3.5">
                        <span className="font-display text-lg leading-[1.2] font-semibold">
                          {p.city_name} {p.practice_area_name}
                        </span>
                        <ArrowRight className="text-stone h-3.5 w-3.5 flex-none" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <CtaBand />
    </>
  );
}

function groupByRegion<T extends { region: string | null }>(items: T[]): Record<string, T[]> {
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

function groupCitiesByCounty<T extends { county_name: string; name: string }>(cities: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const c of cities) (out[c.county_name] ??= []).push(c);
  for (const key of Object.keys(out)) {
    out[key]!.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}
