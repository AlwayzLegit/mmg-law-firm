import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "MMG Law Firm — practice area";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const area = PRACTICE_AREAS.find((p) => p.slug === slug);
  return renderOgImage({
    title: area ? `${area.name} attorney.` : "Personal-injury attorney.",
    subtitle:
      "California personal injury. Free consultation. No fee unless we win.",
  });
}
