import { sitemapIndexXml, xmlResponse } from "@/lib/seo/sitemap-xml";

export const revalidate = 86400;

export function GET() {
  return xmlResponse(sitemapIndexXml());
}
