import { revalidatePath } from "next/cache";

/**
 * Refresh every page of the blog index. Publishing or removing one post
 * shifts posts across all the pages, so `/blog` alone is not enough.
 * The second call covers `/blog/page/<n>`; the front Worker's stored copies
 * are dropped by the same tags (src/lib/cloudflare/page-purge.ts).
 *
 * A typed revalidatePath must spell the route as its folders do, route group
 * included: Next tags a page by its file path, so "/blog/page/[page]" matches
 * nothing and the older pages kept serving the list from before the publish.
 */
export function revalidateBlogIndex(): void {
  revalidatePath("/blog");
  revalidatePath("/(marketing)/blog/page/[page]", "page");
}
