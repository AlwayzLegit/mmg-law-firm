import Link from "next/link";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { getPublishedCounties } from "@/lib/data/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Locations We Serve",
  description:
    "MMG Law Firm represents personal-injury clients across California. Browse the counties and cities we cover, all from our Glendale office.",
  path: "/locations",
});

export const revalidate = 86400;

export default async function LocationsHubPage() {
  const counties = await getPublishedCounties();
  const grouped = groupByRegion(counties);

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
      />

      <section className="container-page py-16 md:py-20">
        {Object.keys(grouped).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center">
            <p className="text-muted-foreground">
              Counties will appear here once they&apos;re published in admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(grouped).map(([region, items]) => (
              <div key={region}>
                <h2 className="font-display text-base font-medium uppercase tracking-wide text-muted-foreground">
                  {region}
                </h2>
                <ul className="mt-4 space-y-2">
                  {items.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/locations/${c.slug}`}
                        className="block rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary hover:text-primary"
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
