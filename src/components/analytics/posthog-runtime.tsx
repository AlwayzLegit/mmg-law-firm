"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

import { TRACK_EVENT, drainTrackQueue } from "@/lib/analytics/track";
import {
  isPrivateAnalyticsPath,
  withoutPrivateAnalyticsUrls,
} from "@/lib/analytics/private-routes";

/**
 * PostHog client init + pageview capture. Loaded lazily by `PostHogLoader`
 * once the page is idle, and only when the public env vars are set.
 *
 * Privacy posture for a law-firm site:
 * - Autocapture is disabled. We capture explicit events (pageviews,
 *   lead-form submit). Autocapture would record click + form-field
 *   interactions, which on a lead form means the visitor's case
 *   narrative — not appropriate.
 * - Session recording is off.
 * - Person profiles only created when we explicitly identify (we don't,
 *   for unauthenticated visitors); reduces PII surface.
 */
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function PostHogRuntime() {
  React.useEffect(() => {
    if (!POSTHOG_KEY || isPrivateAnalyticsPath(window.location.pathname))
      return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // we send these manually below
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
      before_send: (event) => {
        if (!event || isPrivateAnalyticsPath(window.location.pathname))
          return null;
        return {
          ...event,
          properties: withoutPrivateAnalyticsUrls(
            event.properties,
            window.location.origin,
          ),
        };
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV !== "production") ph.debug(false);
      },
    });

    // Drain events fired before the SDK loaded, then keep listening.
    const flush = () => {
      for (const [name, props] of drainTrackQueue())
        posthog.capture(name, props);
    };
    flush();
    window.addEventListener(TRACK_EVENT, flush);
    return () => window.removeEventListener(TRACK_EVENT, flush);
  }, []);

  if (!POSTHOG_KEY) return null;
  return (
    // useSearchParams() needs a Suspense boundary; this component is only
    // ever rendered client-side, but the boundary keeps the tree valid.
    <React.Suspense fallback={null}>
      <PageviewTracker />
    </React.Suspense>
  );
}

/** Sends a manual $pageview every time the route changes. Required because
 *  Next's client-side navigation doesn't trigger a full page load, so
 *  posthog.init's automatic capture would miss SPA transitions. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!POSTHOG_KEY || !pathname || isPrivateAnalyticsPath(pathname)) return;
    let url = window.origin + pathname;
    const q = searchParams?.toString();
    if (q) url = `${url}?${q}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
