import { getPostBySlug } from "@/lib/data/blog";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "MMG Law Firm — blog post";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return renderOgImage({
    eyebrow: "MMG Law Firm — Insights",
    title: post?.title ?? "MMG Law Firm Insights",
    subtitle: post?.subtitle ?? undefined,
  });
}
