import { CtaBand } from "@/components/marketing/cta-band";
import { CaseResultsSection } from "@/components/marketing/case-result-card";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { DISCLAIMERS, FIRM } from "@/lib/constants";
import { getPublishedCaseResults } from "@/lib/data/public-content";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Case Results",
  description: `Anonymized personal-injury case results from ${FIRM.legalName}. Past results do not guarantee a similar outcome.`,
  path: "/case-results",
});

export const revalidate = 86400;

export default async function CaseResultsPage() {
  const results = await getPublishedCaseResults();
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Case Results", path: "/case-results" },
        ]}
      />

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Attorney Advertising
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            Case results
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            A selection of recent recoveries — anonymized to protect client
            privacy. {DISCLAIMERS.results}
          </p>
        </div>
      </section>

      <CaseResultsSection results={results} />
      <CtaBand />
    </>
  );
}
