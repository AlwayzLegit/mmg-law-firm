import type { Metadata } from "next";

import { FIRM, SITE } from "@/lib/constants";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";

type BuildOpts = {
  title: string;
  description: string;
  path: string;
  image?: string;
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
  const imageUrl = image.startsWith("http") ? image : `${siteUrl()}${image}`;
  // The root layout's title.template provides the " | MMG Law Firm" suffix —
  // pass the bare title here so we don't double it.
  const ogTitle = `${title} | ${FIRM.legalName}`;

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
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [imageUrl],
    },
  };
}
