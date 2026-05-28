import type { MetadataRoute } from "next";

import { getPublishedPosts } from "@/lib/data/blog";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import {
  getAllPublishedCities,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";
import { canonicalUrl } from "@/lib/seo/canonical";

// If the total ever exceeds 5,000 URLs, switch to generateSitemaps() with
// chunks of 5,000. We're well under that for now.

const STATIC_ROUTES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}> = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/attorneys/mihran-ghazaryan", priority: 0.9, changeFrequency: "monthly" },
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: canonicalUrl(r.path),
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Practice areas. Static seed is canonical for these — listed even when
  // DB has them unpublished, since the static content is what renders.
  for (const p of PRACTICE_AREAS) {
    entries.push({
      url: canonicalUrl(`/practice-areas/${p.slug}`),
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  // Published counties.
  try {
    const counties = await getPublishedCounties();
    for (const c of counties) {
      entries.push({
        url: canonicalUrl(`/locations/${c.slug}`),
        lastModified: c.updated_at ? new Date(c.updated_at) : lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (err) {
    console.warn("[sitemap] counties:", err);
  }

  // Published cities.
  try {
    const cities = await getAllPublishedCities();
    for (const city of cities) {
      entries.push({
        url: canonicalUrl(`/locations/${city.county_slug}/${city.slug}`),
        lastModified: city.updated_at
          ? new Date(city.updated_at)
          : lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] cities:", err);
  }

  // Published city × practice pages — only those with non-empty
  // local_angle_md per spec §17.
  try {
    const pages = await getPublishedLocationPages();
    for (const page of pages) {
      entries.push({
        url: canonicalUrl(
          `/locations/${page.county_slug}/${page.city_slug}/${page.practice_area_slug}`,
        ),
        lastModified: page.updated_at
          ? new Date(page.updated_at)
          : lastModified,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch (err) {
    console.warn("[sitemap] location-pages:", err);
  }

  // Published blog posts.
  try {
    const posts = await getPublishedPosts();
    for (const post of posts) {
      entries.push({
        url: canonicalUrl(`/blog/${post.slug}`),
        lastModified: post.published_at
          ? new Date(post.published_at)
          : lastModified,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.warn("[sitemap] blog:", err);
  }

  return entries;
}
