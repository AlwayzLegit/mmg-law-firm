import { notFound, permanentRedirect } from "next/navigation";

import { blogPageCount, parseBlogPageParam } from "@/lib/blog-pagination";
import { getPublishedPosts } from "@/lib/data/blog";
import { buildMetadata } from "@/lib/seo/metadata";

import { BlogIndexView } from "../../blog-index-view";

// Older pages of the blog index (`/blog` itself is page 1).
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  const pages = blogPageCount(posts.length);
  return Array.from({ length: pages - 1 }, (_, i) => ({ page: String(i + 2) }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/page/[page]">) {
  const page = parseBlogPageParam((await params).page);
  if (!page) return {};
  // TODO(human): attorney review required — title and description of the
  // older blog index pages are new public copy.
  return buildMetadata({
    title: `California Injury & Employment Law Blog, Page ${page}`,
    description: `Page ${page} of MMG Law Firm's articles on California accidents, injury claims and workplace rights.`,
    path: `/blog/page/${page}`,
  });
}

export default async function BlogIndexOlderPage({
  params,
}: PageProps<"/blog/page/[page]">) {
  const raw = (await params).page;
  // One address per page: page 1 lives at /blog.
  if (raw === "1") permanentRedirect("/blog");
  const page = parseBlogPageParam(raw);
  if (!page) notFound();
  return <BlogIndexView page={page} />;
}
