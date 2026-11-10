import { revalidatePath } from "next/cache";

/**
 * Refresh every page of the blog index. Publishing or removing one post
 * shifts posts across all the pages, so `/blog` alone is not enough.
 * The second call covers `/blog/page/<n>`; the front Worker's stored copies
 * are dropped by the same tags (src/lib/cloudflare/page-purge.ts).
 */
export function revalidateBlogIndex(): void {
  revalidatePath("/blog");
  revalidatePath("/blog/page/[page]", "page");
}
