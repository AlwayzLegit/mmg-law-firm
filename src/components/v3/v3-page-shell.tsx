import type { ComponentType, ReactNode } from "react";

import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage, FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";
import { V3_BY_KEY, v3Crumbs } from "@/lib/v3/pages";

import { V3_FAQS } from "./v3-faqs";
import { V3_FAQS_EXTRACTED } from "./v3-faqs-extracted";

export function v3Metadata(key: string) {
  const m = V3_BY_KEY[key];
  return buildMetadata({ title: m.title, description: m.description, path: m.path });
}

/**
 * Renders a page from the v3 design handoff together with its structured
 * data: breadcrumb trail, FAQPage (when the page shows Q&A pairs) and a
 * LegalService node for practice pages. `children` render after the design
 * content (e.g. live DB sections such as city links).
 *
 * Callers pass the page body component directly (`page`) rather than this
 * module looking it up in a registry of all 50 pages: a shared registry put
 * every page's client islands (lead form, resource tools) into every route's
 * bundle.
 */
export function V3PageShell({
  pageKey,
  page: Page,
  children,
  crumbs: crumbsOverride,
}: {
  pageKey: string;
  /** The generated page body for `pageKey` (from `./pages/*`). */
  page: ComponentType;
  children?: ReactNode;
  /** Breadcrumb trail override (defaults to the registry hierarchy). */
  crumbs?: { name: string; path: string }[];
}) {
  const m = V3_BY_KEY[pageKey];
  if (!m) throw new Error(`Unknown v3 page: ${pageKey}`);
  const crumbs = crumbsOverride ?? v3Crumbs(pageKey);
  // Converter-captured FAQs first, else the ones extracted from the rendered
  // accordions (tools/v3-design/extract-faqs.mjs).
  const faqs = V3_FAQS[pageKey] ?? V3_FAQS_EXTRACTED[pageKey] ?? [];
  const graphs: object[] = [];
  if (faqs.length) graphs.push(buildFaqPage(faqs));
  if (m.practiceArea && ["car", "truck", "moto", "injury"].includes(m.group)) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "LegalService",
      "@id": `${canonicalUrl(m.path)}#legal-service`,
      name: `${FIRM.legalName} — ${m.label}`,
      url: canonicalUrl(m.path),
      image: defaultOgImageUrl(),
      description: m.description,
      telephone: FIRM.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: FIRM.address.street,
        addressLocality: FIRM.address.city,
        addressRegion: FIRM.address.state,
        postalCode: FIRM.address.zip,
        addressCountry: FIRM.address.country,
      },
      areaServed: { "@type": "State", name: "California" },
      parentOrganization: { "@id": FIRM_LEGAL_SERVICE_ID },
      knowsAbout: m.label,
    });
  }
  return (
    <>
      {crumbs.length > 1 ? <BreadcrumbJsonLd crumbs={crumbs} /> : null}
      {graphs.map((g, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(g) }} />
      ))}
      <Page />
      {children}
    </>
  );
}
