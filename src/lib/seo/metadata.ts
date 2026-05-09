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
  const siteTitle = `${title} | ${FIRM.legalName}`;

  return {
    title: siteTitle,
    description,
    metadataBase: new URL(siteUrl()),
    alternates: {
      canonical: url,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: siteTitle,
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
          alt: siteTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description,
      images: [imageUrl],
    },
  };
}
