import RootDocument, {
  metadata as rootMetadata,
} from "@/components/layout/root-document";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { NotFoundAnalytics } from "@/components/analytics/public-analytics";
import { env } from "@/lib/env";
import { FIRM } from "@/lib/constants";
import MarketingNotFound from "./(marketing)/not-found";

export { viewport } from "@/components/layout/root-document";

export const metadata = {
  ...rootMetadata,
  title: { absolute: `Page Not Found | ${FIRM.legalName}` },
  description: "We could not find the page you were looking for.",
  robots: { index: false, follow: false },
};

/**
 * Unmatched URLs resolve outside both root layouts. Keep the public 404 shell so
 * it gets the v3 header, footer (with the CRPC disclaimers) and mobile dock
 * like every other public page.
 */
export default function NotFound() {
  return (
    <RootDocument>
      <MarketingShell>
        <MarketingNotFound />
      </MarketingShell>
      <NotFoundAnalytics gaId={env.NEXT_PUBLIC_GA_ID} />
    </RootDocument>
  );
}
