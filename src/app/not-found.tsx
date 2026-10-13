import MarketingLayout from "./(marketing)/layout";
import MarketingNotFound from "./(marketing)/not-found";

export const metadata = {
  title: "Page Not Found",
  description: "We could not find the page you were looking for.",
  robots: { index: false, follow: false },
};

/**
 * Unmatched URLs (e.g. /foo) resolve to this root not-found, which sits
 * outside every route group. Wrap the public 404 in the marketing layout so
 * it gets the v3 header, footer (with the CRPC disclaimers) and mobile dock
 * like every other public page.
 */
export default function NotFound() {
  return (
    <MarketingLayout>
      <MarketingNotFound />
    </MarketingLayout>
  );
}
