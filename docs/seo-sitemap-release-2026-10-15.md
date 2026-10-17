# Sitemap integrity release

## Scope
Preserve existing page addresses and all frozen meta titles/descriptions. Keep `/sitemap.xml` as the discovery entry point, now an index of car, truck, motorcycle and other XML sitemaps. Topic groups include existing related design-registry guides. No page copy, publishing flags, redirects or database records are changed.

## Fixes
- Omit generated lastmod dates for static content and unreliable publication-only dates for blogs.
- Retain valid, non-future database update dates for location content.
- Deduplicate URLs, preserve image references and escape XML.
- Exclude whitespace-only local-angle content from the sitemap.
- Fail sitemap generation on query errors rather than advertising a partial success. Existing non-sitemap query consumers retain their previous fallback behavior.
- Remove unsupported robots Host directive; preserve crawl rules.
- Refresh child sitemaps from existing blog and explicit sitemap revalidation hooks.
- Admin blog edits and publish/unpublish toggles now also invalidate the sitemap partitions. Publish toggles clear cached blog detail pages. A live published article (`/blog/slip-and-fall-lawyer-california-5`) was linked internally but absent from the 955-URL production sitemap on October 15; preview inventory checks must account for legitimate newly published content rather than require exactly 955 URLs.
- Refresh all sitemap partitions after successful location-page edits, publish toggles and bulk publishing changes. Individual publish toggles also invalidate the public location-page route pattern, clearing cached pages/404s. No mutation payloads or metadata generators are changed.

## Gates before production
- Unit tests, TypeScript, scoped lint and production build.
- Preview XML parses; root lists exactly four working child sitemaps; invalid child returns 404.
- Compare combined preview loc entries against current production inventory (955 at initial audit); investigate every difference rather than automatically approving it.
- Verify production data is available in the preview; a seed-only build does not prove inventory preservation.
- Compare priority page meta titles/descriptions against the captured live baseline.
- After release, repeat live XML and URL checks, submit the sitemap index in GSC and record observed status. A submission is not proof of indexing.

## Remaining broader goal
Complete GSC exclusion reconciliation and performance baselines, then proceed with attorney-reviewed content and internal-link improvements across all California markets. This sitemap release alone is not completion of the full SEO plan and is not a Google 100/100 score.
