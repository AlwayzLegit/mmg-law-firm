import { siteUrl } from "@/lib/seo/canonical";

/**
 * Staging rehearsal switch (OPS-347): makes the lead insert fail on purpose so
 * the NOT STORED email can be seen end to end. It is read only when the site
 * URL is the staging host, so production ignores it whatever its environment
 * holds. Staging shares the production database; a forced failure never
 * touches it because the store is skipped before any call.
 */
export const STAGING_HOST = "staging.mmg-lawfirm.com";

export function forcedInsertFailure(): boolean {
  if (process.env.LEADS_FORCE_INSERT_FAIL !== "1") return false;
  try {
    return new URL(siteUrl()).hostname === STAGING_HOST;
  } catch {
    return false;
  }
}
