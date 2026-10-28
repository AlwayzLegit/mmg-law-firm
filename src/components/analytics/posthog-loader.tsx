"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { startPhoneClickTracking } from "@/lib/analytics/phone-clicks";
import { isPrivateAnalyticsPath } from "@/lib/analytics/private-routes";
import { afterPageIdle } from "@/lib/after-page-idle";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

const PostHogRuntime = dynamic(
  () => import("./posthog-runtime").then((m) => m.PostHogRuntime),
  { ssr: false },
);

/**
 * Mounts the PostHog runtime only after the page has gone idle (or after a
 * short timeout), so the ~65 KB analytics chunk never competes with
 * hydration or the LCP. Renders nothing when the public key isn't set.
 * Events fired before the runtime loads are queued by `lib/analytics/track`.
 */
export function PostHogLoader() {
  const [ready, setReady] = React.useState(false);

  // Capture early phone clicks into the same queue as form events. Waiting
  // for the deferred SDK would miss visitors who immediately tap Call.
  React.useEffect(() => {
    if (!POSTHOG_KEY || isPrivateAnalyticsPath(window.location.pathname))
      return;
    return startPhoneClickTracking();
  }, []);

  React.useEffect(() => {
    if (!POSTHOG_KEY || isPrivateAnalyticsPath(window.location.pathname))
      return;
    return afterPageIdle(() => {
      if (!isPrivateAnalyticsPath(window.location.pathname)) setReady(true);
    });
  }, []);

  if (!POSTHOG_KEY || !ready) return null;
  return <PostHogRuntime />;
}
