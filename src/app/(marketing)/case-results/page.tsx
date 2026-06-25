import { notFound } from "next/navigation";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CaseResultsFilterable } from "@/components/marketing/case-results-filterable";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { getPublishedCaseResults } from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal Injury Case Results",
  description: `Anonymized personal-injury case results from ${FIRM.legalName}. Past results do not guarantee a similar outcome.`,
  path: "/case-results",
});

export const revalidate = 86400;

export default async function CaseResultsPage() {
  const results = await getPublishedCaseResults(120);
  // No published results → no page. The nav link and sitemap entry are
  // suppressed in tandem, so this is only reachable by a direct URL.
  if (results.length === 0) notFound();
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Case Results", path: "/case-results" },
        ]}
      />

      <PageHero
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Case Results" }]}
        title="California Personal Injury Case Results"
        description={
          <>Anonymized to protect client privacy. {DISCLAIMERS.results}</>
        }
        aside={
          <AttorneyHeroAside
            image={pickLocationImage("case-results").name}
            alt={pickLocationImage("case-results").alt}
            priority
          />
        }
      />

      <CaseResultsFilterable results={results} />

      <p className="container-page text-muted-foreground pb-12 text-xs leading-relaxed">
        {DISCLAIMERS.results}
      </p>

      <CtaBand />
    </>
  );
}
