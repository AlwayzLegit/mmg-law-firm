import type { MetadataRoute } from "next";

import { getAttorneyProfile } from "@/lib/data/attorney";
import { getPublishedPosts } from "@/lib/data/blog";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import {
  getAllPublishedCities,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
import { sharedContentRevision } from "@/lib/seo/content-revisions";
import { V3_GUIDES } from "@/lib/v3/pages";

/** Normalize a possibly-relative image URL to absolute for the sitemap. */
function absImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${siteUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Shared inventory for the four topic sitemaps. Keep page metadata out of
// this pipeline: the owner's title/description freeze applies sitewide.

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  {
    path: "/attorneys/mihran-ghazaryan",
    priority: 0.9,
    changeFrequency: "monthly",
  },
  { path: "/practice-areas", priority: 0.8, changeFrequency: "monthly" },
  { path: "/locations", priority: 0.8, changeFrequency: "monthly" },
  { path: "/case-results", priority: 0.6, changeFrequency: "monthly" },
  { path: "/reviews", priority: 0.6, changeFrequency: "monthly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/accessibility", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/ccpa", priority: 0.3, changeFrequency: "yearly" },
];

export async function getSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  // Don't advertise content index pages that have nothing published yet —
  // they 404, so listing them would be a soft-404 in Search Console.
  const posts = await getPublishedPosts(true);
  // /case-results and /reviews always render the v3 guide content now.
  const staticRoutes = STATIC_ROUTES.filter((r) =>
    r.path === "/blog" ? posts.length > 0 : true,
  );

  // Attorney headshot, attached to the bio route as an indexable image.
  let attorneyHeadshot: string | null = null;
  try {
    const attorney = await getAttorneyProfile("mihran-ghazaryan");
    attorneyHeadshot = absImage(attorney?.headshot_url);
  } catch (err) {
    console.warn("[sitemap] attorney:", err);
  }

  const entries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: canonicalUrl(r.path),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
    ...(r.path === "/attorneys/mihran-ghazaryan" && attorneyHeadshot
      ? { images: [attorneyHeadshot] }
      : {}),
  }));

  // Guide pages from the v3 design (root-level slugs).
  for (const g of V3_GUIDES) {
    entries.push({
      url: canonicalUrl(g.path),
      changeFrequency: "monthly",
      priority: ["car", "truck", "moto", "injury"].includes(g.group)
        ? 0.8
        : 0.6,
    });
  }

  // Practice areas. Static seed is canonical for these — listed even when
  // DB has them unpublished, since the static content is what renders.
  for (const p of PRACTICE_AREAS) {
    entries.push({
      url: canonicalUrl(`/practice-areas/${p.slug}`),
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Published counties.
  try {
    const counties = await getPublishedCounties(true);
    for (const c of counties) {
      entries.push({
        url: canonicalUrl(`/locations/${c.slug}`),
        lastModified: validSitemapDate(c.updated_at),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap] counties:", err);
    throw err;
  }

  // Published cities.
  try {
    const cities = await getAllPublishedCities(true);
    for (const city of cities) {
      entries.push({
        url: canonicalUrl(`/locations/${city.county_slug}/${city.slug}`),
        lastModified: validSitemapDate(city.updated_at),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] cities:", err);
    throw err;
  }

  // Published city × practice pages — only those with non-empty
  // local_angle_md per spec §17.
  try {
    const pages = await getPublishedLocationPages(true);
    for (const page of pages) {
      if (!page.local_angle_md?.trim()) continue;
      entries.push({
        url: canonicalUrl(
          `/locations/${page.county_slug}/${page.city_slug}/${page.practice_area_slug}`,
        ),
        lastModified: validSitemapDate(page.updated_at),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.warn("[sitemap] location-pages:", err);
    throw err;
  }

  // Published blog posts.
  try {
    for (const post of posts) {
      const hero = absImage(post.hero_image_url);
      entries.push({
        url: canonicalUrl(`/blog/${post.slug}`),
        // Publication is not a reliable last modification timestamp.
        // Omit until the data layer provides a verified content update date.
        changeFrequency: "monthly",
        priority: 0.6,
        ...(hero ? { images: [hero] } : {}),
      });
    }
  } catch (err) {
    console.warn("[sitemap] blog:", err);
    throw err;
  }

  const revisedEntries = entries.map((entry) => {
    const revision = validSitemapDate(sharedContentRevision(new URL(entry.url).pathname));
    if (!revision) return entry;
    const stored = entry.lastModified instanceof Date
      ? entry.lastModified : validSitemapDate(entry.lastModified);
    return { ...entry, lastModified: stored && stored > revision ? stored : revision };
  });
  return [...new Map(revisedEntries.map((entry) => [entry.url, entry])).values()];
}

export function validSitemapDate(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now()
    ? date
    : undefined;
}
