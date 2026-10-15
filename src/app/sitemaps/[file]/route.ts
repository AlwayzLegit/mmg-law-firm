import { getSitemapEntries } from "@/lib/seo/sitemap-entries";
import {
  SITEMAP_GROUPS,
  sitemapGroup,
  sitemapXml,
  xmlResponse,
} from "@/lib/seo/sitemap-xml";

export const revalidate = 86400;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const group = SITEMAP_GROUPS.find((value) => `${value}.xml` === file);
  if (!group) return new Response("Not found", { status: 404 });
  const entries = await getSitemapEntries();
  return xmlResponse(
    sitemapXml(entries.filter((entry) => sitemapGroup(entry.url) === group)),
  );
}
