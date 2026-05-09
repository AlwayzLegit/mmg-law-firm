import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/seo/canonical";

// TODO(human): expand this once published rows exist in Supabase. Group D
// adds counties / cities / city x practice URLs; Group E adds blog posts and
// case-results pages. Wire those queries when the data layer lands. If the
// total ever exceeds 5,000 URLs, switch to generateSitemaps() + chunks.

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
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

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return STATIC_ROUTES.map((route) => ({
    url: canonicalUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
