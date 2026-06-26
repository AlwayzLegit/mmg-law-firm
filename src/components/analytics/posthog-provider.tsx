"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * PostHog client init + pageview capture. Initialized only when the public
 * env vars are set — otherwise the provider passes children through and
 * nothing is captured (so local dev and preview deploys stay clean).
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

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (typeof window === "undefined") return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: false, // we send these manually below
      capture_pageleave: true,
      autocapture: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
      loaded: (ph) => {
        if (process.env.NODE_ENV !== "production") ph.debug(false);
      },
    });
  }, []);

  // Site-wide phone-click capture. `tel:` links live in the header, footer,
  // every page hero, and CTA bands — a delegated listener captures all of them
  // as a `phone_click` conversion event without instrumenting each component.
  // No PII: we record only the page path, not the number (it's a firm constant).
  React.useEffect(() => {
    if (!POSTHOG_KEY) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.('a[href^="tel:"]') as HTMLAnchorElement | null;
      if (!link) return;
      posthog.capture("phone_click", { pathname: window.location.pathname });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;
  return (
    <PHProvider client={posthog}>
      <PageviewTracker />
      {children}
    </PHProvider>
  );
}

/** Sends a manual $pageview every time the route changes. Required because
 *  Next's client-side navigation doesn't trigger a full page load, so
 *  posthog.init's automatic capture would miss SPA transitions. */
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!POSTHOG_KEY || !pathname) return;
    let url = window.origin + pathname;
    const q = searchParams?.toString();
    if (q) url = `${url}?${q}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
