import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import {
  findPracticeArea,
} from "@/lib/data/practice-areas";
import { PRACTICE_AREA_CONTENT } from "@/lib/data/practice-area-content";
import {
  getLocationPage,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage } from "@/lib/seo/schema";
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
  return buildMetadata({
    title: `${row.city_name} ${row.practice_area_name} Lawyer`,
    description:
      row.meta_description ??
      `${FIRM.legalName} handles ${row.practice_area_name.toLowerCase()} matters for ${row.city_name} clients. Free consultation. Bilingual representation.`,
    path: `/locations/${row.county_slug}/${row.city_slug}/${row.practice_area_slug}`,
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

  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
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
    serviceType: area?.lawyerPhrase ?? row.practice_area_name,
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(legalService).replace(/</g, "\\u003c"),
        }}
      />
      {faqGraph ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqGraph).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

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
              href={`/locations/${row.county_slug}`}
              className="hover:text-primary"
            >
              {row.county_name}
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <Link
              href={`/locations/${row.county_slug}/${row.city_slug}`}
              className="hover:text-primary"
            >
              {row.city_name}
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <span className="text-foreground">{row.practice_area_name}</span>
          </nav>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            {row.city_name} {row.practice_area_name} Attorney
          </h1>

          {row.intro_md ? (
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              {row.intro_md}
            </p>
          ) : null}

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
                {row.practice_area_name} matters in {row.city_name}
              </h2>
              <div className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
                {row.local_angle_md}
              </div>
            </section>

            {content?.process?.length ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  How we work
                </h2>
                <ol className="mt-6 space-y-5">
                  {content.process.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-medium">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {content?.whatToDo?.length ? (
              <section className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight">
                  What to do right away
                </h2>
                <ul className="mt-6 space-y-3">
                  {content.whatToDo.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 flex-none text-primary"
                        aria-hidden
                      />
                      <span className="text-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-muted-foreground">
                  {DISCLAIMERS.general}
                </p>
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
        <Faq items={row.faq_json} heading={`${row.city_name} ${row.practice_area_name} FAQ`} />
      ) : content?.faqs?.length ? (
        <Faq items={content.faqs} heading={`${row.practice_area_name} FAQ`} />
      ) : null}

      <CtaBand
        heading={`Injured in ${row.city_name}?`}
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
