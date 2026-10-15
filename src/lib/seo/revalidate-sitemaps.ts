import { revalidatePath } from "next/cache";
import { SITEMAP_GROUPS } from "./sitemap-xml";

/** Refresh every partition after a location's sitemap eligibility changes. */
export function revalidateSitemaps(): void {
  revalidatePath("/sitemap.xml");
  for (const group of SITEMAP_GROUPS) {
    revalidatePath(`/sitemaps/${group}.xml`);
  }
}
