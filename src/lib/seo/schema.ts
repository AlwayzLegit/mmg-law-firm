import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import {
  attorneySameAs,
  firmSameAs,
  getFirmSettings,
} from "@/lib/data/firm-settings";
import { canonicalUrl, defaultOgImageUrl, siteUrl } from "@/lib/seo/canonical";

type GraphNode = Record<string, unknown>;

const FIRM_ID = `${siteUrl()}#legal-service`;
const ATTORNEY_ID = `${siteUrl()}#attorney-mihran`;
const WEBSITE_ID = `${siteUrl()}#website`;

function legalServiceNode(sameAs: string[]): GraphNode {
  return {
    "@type": "LegalService",
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
