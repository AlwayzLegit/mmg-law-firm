import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import {
  attorneySameAs,
  firmSameAs,
  getFirmSettings,
} from "@/lib/data/firm-settings";
import { canonicalUrl, defaultOgImageUrl, siteUrl } from "@/lib/seo/canonical";

type GraphNode = Record<string, unknown>;

/** Canonical `@id` of the firm's single LegalService entity, defined in the
 *  sitewide graph (buildOrganizationGraph). Per-page LegalService nodes
 *  reference this via `parentOrganization` so search engines see one business
 *  serving many areas — not many competing businesses. */
export const FIRM_LEGAL_SERVICE_ID = `${siteUrl()}#legal-service`;
const FIRM_ID = FIRM_LEGAL_SERVICE_ID;
const ATTORNEY_ID = `${siteUrl()}#attorney-mihran`;
const WEBSITE_ID = `${siteUrl()}#website`;

function legalServiceNode(sameAs: string[]): GraphNode {
  return {
    // `Attorney` is the most specific schema.org subtype of LegalService —
    // pairing both gives search engines an explicit legal-vertical signal
    // while preserving the LegalService @id other nodes reference.
    "@type": ["LegalService", "Attorney"],
    "@id": FIRM_ID,
    name: FIRM.legalName,
    url: siteUrl(),
    telephone: FIRM.phone,
    image: defaultOgImageUrl(),
    priceRange: "Free Consultation",
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: FIRM.geo.lat,
      longitude: FIRM.geo.lng,
    },
    areaServed: {
      "@type": "State",
      name: "California",
    },
    sameAs,
  };
}

function attorneyNode(sameAs: string[]): GraphNode {
  return {
    "@type": "Person",
    "@id": ATTORNEY_ID,
    name: FIRM.attorneyName,
    jobTitle: "Attorney",
    worksFor: { "@id": FIRM_ID },
    memberOf: {
      "@type": "Organization",
      name: "State Bar of California",
    },
    identifier: FIRM.barNumber,
    url: canonicalUrl("/attorneys/mihran-ghazaryan"),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

function websiteNode(): GraphNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteUrl(),
    name: FIRM.legalName,
    publisher: { "@id": FIRM_ID },
  };
}

export async function buildOrganizationGraph(): Promise<GraphNode> {
  const settings = await getFirmSettings();
  return {
    "@context": "https://schema.org",
    "@graph": [
      legalServiceNode(firmSameAs(settings)),
      attorneyNode(attorneySameAs(settings)),
      websiteNode(),
    ],
  };
}

export type Crumb = { name: string; path: string };

export function buildBreadcrumbList(crumbs: Crumb[]): GraphNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  };
}

type FaqItem = { question: string; answer: string };

export function buildFaqPage(items: FaqItem[]): GraphNode {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.answer,
      },
    })),
  };
}

type ReviewItem = {
  id: string;
  initials: string;
  quote: string;
  rating?: number;
};

function clampRating(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}

/**
 * AggregateRating + Review schema for the /reviews page, attached to the
 * firm's LegalService node (same @id) so Google can associate the stars with
 * the business. Returns null when there are no approved reviews — we never
 * emit an empty or invented rating (CRPC §7.1 / spec hard rule #6).
 */
export function buildReviewsSchema(reviews: ReviewItem[]): GraphNode | null {
  if (reviews.length === 0) return null;
  const ratings = reviews.map((r) => clampRating(r.rating ?? 5));
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return {
    "@context": "https://schema.org",
    // Mirror the firm node's type so the shared @id merges cleanly.
    "@type": ["LegalService", "Attorney"],
    "@id": FIRM_ID,
    name: FIRM.legalName,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Math.round(avg * 10) / 10,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.initials },
      reviewBody: r.quote,
      reviewRating: {
        "@type": "Rating",
        ratingValue: clampRating(r.rating ?? 5),
        bestRating: 5,
        worstRating: 1,
      },
    })),
  };
}

type ArticleOpts = {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedAt?: string;
  modifiedAt?: string;
  author?: string;
};

export function buildArticle({
  title,
  description,
  path,
  image,
  publishedAt,
  modifiedAt,
  author = FIRM.attorneyName,
}: ArticleOpts): GraphNode {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    mainEntityOfPage: canonicalUrl(path),
    image: image ? [image] : undefined,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: { "@id": FIRM_ID },
    datePublished: publishedAt,
    dateModified: modifiedAt ?? publishedAt,
  };
}

export const FIRM_DISPLAY_ADDRESS = FIRM_FULL_ADDRESS;
