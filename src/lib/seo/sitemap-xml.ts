import type { MetadataRoute } from "next";
import { canonicalUrl } from "@/lib/seo/canonical";
import { V3_GUIDES } from "@/lib/v3/pages";

export const SITEMAP_GROUPS = [
  "car-accidents",
  "truck-accidents",
  "motorcycle-accidents",
  "other",
] as const;
export type SitemapGroup = (typeof SITEMAP_GROUPS)[number];
const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );

export function sitemapGroup(url: string): SitemapGroup {
  const pathname = new URL(url).pathname;
  const topic = pathname.split("/").at(-1);
  if (SITEMAP_GROUPS.slice(0, 3).includes(topic as SitemapGroup))
    return topic as SitemapGroup;
  const guide = V3_GUIDES.find((entry) => entry.path === pathname);
  if (
    guide?.practiceArea &&
    SITEMAP_GROUPS.slice(0, 3).includes(guide.practiceArea as SitemapGroup)
  )
    return guide.practiceArea as SitemapGroup;
  const groups: Record<string, SitemapGroup> = {
    car: "car-accidents",
    truck: "truck-accidents",
    moto: "motorcycle-accidents",
  };
  return (guide && groups[guide.group]) || "other";
}

export function sitemapIndexXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    SITEMAP_GROUPS.map(
      (group) =>
        `<sitemap><loc>${escapeXml(canonicalUrl(`/sitemaps/${group}.xml`))}</loc></sitemap>`,
    ).join("") +
    "</sitemapindex>"
  );
}

export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' +
    entries
      .map((entry) => {
        const lastmod =
          entry.lastModified instanceof Date
            ? entry.lastModified.toISOString()
            : entry.lastModified;
        return `<url><loc>${escapeXml(entry.url)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ""}${(entry.images || []).map((image) => `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`).join("")}</url>`;
      })
      .join("") +
    "</urlset>"
  );
}

export function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
