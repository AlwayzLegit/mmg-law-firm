"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

import { TRACK_EVENT, drainTrackQueue, track } from "@/lib/analytics/track";
import {
  isPrivateAnalyticsPath,
  filterPublicAnalyticsEvent,
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

// Client-document state: StrictMode and runtime remounts must not reinitialize
// the singleton SDK or count the same current route twice.
let initialized = false;
let lastPageviewUrl: string | null = null;

export function PostHogRuntime() {
  React.useEffect(() => {
    if (!POSTHOG_KEY || isPrivateAnalyticsPath(window.location.pathname))
      return;
    if (!initialized) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: false, // we send these manually below
        capture_pageleave: true,
        autocapture: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        before_send: (event) =>
          filterPublicAnalyticsEvent(event, window.location),
        loaded: (ph) => {
          if (process.env.NODE_ENV !== "production") ph.debug(false);
        },
      });
      initialized = true;
    }

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
  const query = searchParams?.toString() ?? "";

  React.useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return;
    if (
      isPrivateAnalyticsPath(pathname) ||
      isPrivateAnalyticsPath(window.location.pathname)
    ) {
      lastPageviewUrl = null;
      return;
    }
    let url = window.origin + pathname;
    if (query) url = `${url}?${query}`;
    if (url === lastPageviewUrl) return;
    // Child effects run before the parent initializer. Queue the first view
    // just like other early public events; the SDK otherwise drops it.
    track("$pageview", { $current_url: url });
    lastPageviewUrl = url;
  }, [pathname, query]);

  return null;
}
