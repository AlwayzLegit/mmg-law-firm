"use client";

import * as React from "react";
import dynamic from "next/dynamic";

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

  React.useEffect(() => {
    if (!POSTHOG_KEY) return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setReady(true);
    };
    const schedule = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(start, { timeout: 4000 });
      else window.setTimeout(start, 2500);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
    };
  }, []);

  if (!POSTHOG_KEY || !ready) return null;
  return <PostHogRuntime />;
}
