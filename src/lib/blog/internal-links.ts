import { SITE } from "@/lib/constants";

/**
 * Point markdown links at their final URL when the path is a source in the
 * admin-managed `redirects` table. Posts keep linking to slugs that were
 * later merged (the 2026-10 dedupe left `/blog/x-2` → `/blog/x` redirects),
 * and a link that 308s costs crawl budget and a round trip. The post body
 * itself is left untouched; this runs at render time.
 *
 * Handles `[text](/path)` and `[text](https://www.mmg-lawfirm.com/path)`,
 * keeping any `#hash` or `?query`.
 */
export function resolveInternalLinks(md: string, redirects: ReadonlyMap<string, string>): string {
  if (redirects.size === 0) return md;
  const origin = SITE.productionUrl.replace(/\/$/, "");
  return md.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (whole, target: string, title = "") => {
    const local = target.startsWith(origin) ? target.slice(origin.length) || "/" : target;
    if (!local.startsWith("/") || local.startsWith("//")) return whole;
    const cut = local.search(/[?#]/);
    const path = cut === -1 ? local : local.slice(0, cut);
    const rest = cut === -1 ? "" : local.slice(cut);
    const dest = redirects.get(path) ?? redirects.get(path.replace(/\/$/, ""));
    return dest ? `](${dest}${rest}${title})` : whole;
  });
}
