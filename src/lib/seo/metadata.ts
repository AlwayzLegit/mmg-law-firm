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

/**
 * Search results cut meta descriptions at roughly 155–160 characters. Keep
 * whole sentences that fit; if even the first sentence is too long, cut it
 * at a word boundary and add an ellipsis.
 */
export function fitMetaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sentences = clean.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [clean];
  let out = "";
  for (const raw of sentences) {
    const next = out ? `${out} ${raw.trim()}` : raw.trim();
    if (next.length > max) break;
    out = next;
  }
  if (out) return out;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, "")}…`;
}

export function buildMetadata({
  title,
  description,
  path,
  image = SITE.defaultOgImage,
  noindex = false,
  ogType = "website",
}: BuildOpts): Metadata {
  description = fitMetaDescription(description);
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
