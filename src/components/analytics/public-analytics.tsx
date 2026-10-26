"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { PostHogLoader } from "./posthog-loader";
import { googleAnalyticsInit } from "@/lib/analytics/google-init";
import { isPrivateAnalyticsPath } from "@/lib/analytics/private-routes";

/** Only the marketing root mounts this; private roots never load either SDK. */
export function PublicAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <PostHogLoader />
      {gaId ? (
        <>
          {/* ga-init defines gtag(), queues the config, and loads the gtag.js
              library itself after the page (see google-init.ts). */}
          <Script id="ga-init" strategy="afterInteractive">
            {googleAnalyticsInit(gaId)}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** Unmatched URLs have their own document. Check the actual URL before
 * loading analytics so even /admin/unknown 404s stay outside collection. */
export function NotFoundAnalytics({ gaId }: { gaId: string }) {
  const publicPage = useSyncExternalStore(
    subscribeToDocument,
    isPublicDocument,
    serverSnapshot,
  );
  return publicPage ? <PublicAnalytics gaId={gaId} /> : null;
}

// A global 404 is its own document, not an SPA layout shared with other routes.
const subscribeToDocument = () => () => {};
const serverSnapshot = () => false;
const isPublicDocument = () =>
  !isPrivateAnalyticsPath(window.location.pathname);
