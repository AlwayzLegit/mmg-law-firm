import { getPostBySlug } from "@/lib/data/blog";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;

// Post-specific alt text so the social card has a meaningful description when
// the image itself can't load. Falls back to a generic label for missing posts.
export async function generateImageMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  return [
    {
      id: "default",
      alt: post?.title
        ? `${post.title} — MMG Law Firm`
        : "MMG Law Firm — blog post",
      size: OG_SIZE,
      contentType: OG_CONTENT_TYPE,
    },
  ];
}

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
