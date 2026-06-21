import type { Metadata } from "next";

import { FIRM, SITE } from "@/lib/constants";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";

type BuildOpts = {
  title: string;
  description: string;
  path: string;
  /**
   * Explicit OG/Twitter image URL. Omit for the site default. Pass `null`
   * on routes that ship their own `opengraph-image.tsx` so the file
   * convention supplies a per-page image (an explicit value here would
   * otherwise override it).
   */
  image?: string | null;
  noindex?: boolean;
  ogType?: "website" | "article" | "profile";
};

export function buildMetadata({
  title,
  description,
  path,
  image = SITE.defaultOgImage,
  noindex = false,
  ogType = "website",
}: BuildOpts): Metadata {
  const url = canonicalUrl(path);
  // The root layout's title.template provides the " | MMG Law Firm" suffix —
  // pass the bare title here so we don't double it.
  const ogTitle = `${title} | ${FIRM.legalName}`;

  // When image is null, omit images entirely so Next's opengraph-image.tsx
  // file convention provides the (per-page) card.
  const imageUrl =
    image == null
      ? null
      : image.startsWith("http")
        ? image
        : `${siteUrl()}${image}`;

  return {
    title,
    description,
    metadataBase: new URL(siteUrl()),
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: FIRM.legalName,
      type: ogType,
      locale: "en_US",
      ...(imageUrl
        ? {
            images: [{ url: imageUrl, width: 1200, height: 630, alt: ogTitle }],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}
