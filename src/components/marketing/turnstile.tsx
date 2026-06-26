"use client";

import * as React from "react";
import Script from "next/script";

import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      theme?: "light" | "dark" | "auto";
      callback: (token: string) => void;
      "error-callback"?: (err: unknown) => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
  className?: string;
  action?: string;
};

/**
 * Cloudflare Turnstile widget. If the site key is empty (typical in local dev
 * without a Cloudflare account), we skip the widget and emit a dev-only stub
 * token. The server-side verifier accepts this in non-production.
 */
export function Turnstile({ siteKey, onToken, className, action }: Props) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  // Set when Cloudflare's `error-callback` fires — typically a hostname that
  // isn't allow-listed for this site key, or an invalid key. (Token expiry is
  // handled separately and auto-refreshes, so it does NOT set this.) When true
  // we swap the widget for a visible phone fallback so the lead isn't lost.
  const [errored, setErrored] = React.useState(false);

  // Dev fallback: with no site key configured (typical local dev), emit a
  // placeholder token the server accepts in non-production. In production a
  // missing key is a misconfiguration — we deliberately do NOT emit a stub
  // (the server would reject it); the render path below shows a visible notice.
  React.useEffect(() => {
    if (!siteKey && process.env.NODE_ENV !== "production") {
      onToken("dev-no-turnstile");
    }
  }, [siteKey, onToken]);

  React.useEffect(() => {
    if (!siteKey || !loaded || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      callback: (token) => {
        setErrored(false);
        onToken(token);
      },
      "error-callback": () => {
        setErrored(true);
        onToken("");
      },
      "expired-callback": () => onToken(""),
    });
    widgetIdRef.current = id;
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, loaded, onToken, action]);

  // Shown whenever verification can't work: missing key in prod, or the widget
  // hit an error-callback (e.g. this hostname isn't allow-listed for the site
  // key). Gives the visitor a working path (a phone call) instead of a form
  // that silently won't submit.
  const unavailableNotice = (
    <div
      role="alert"
      className={cn(
        "border-border bg-secondary/60 text-foreground rounded-lg border px-4 py-3 text-sm",
        className,
      )}
    >
      Our verification step is temporarily unavailable, so this form can&apos;t
      be submitted right now. Please call us at{" "}
      <a
        href={`tel:${FIRM.phoneTel}`}
        className="text-primary font-semibold underline"
      >
        {FIRM.phone}
      </a>{" "}
      and we&apos;ll start your free consultation by phone.
    </div>
  );

  if (!siteKey) {
    // In dev we surface the missing-key reason out loud so the developer
    // knows the form is in stub mode.
    if (process.env.NODE_ENV !== "production") {
      return (
        <p className={className}>
          <span className="text-xs text-muted-foreground">
            (CAPTCHA disabled in dev — set NEXT_PUBLIC_TURNSTILE_SITE_KEY to
            enable)
          </span>
        </p>
      );
    }
    // Production misconfiguration: the anti-bot key is missing, so the widget
    // can't load and the form can't be verified.
    return unavailableNotice;
  }

  // The widget loaded but Cloudflare rejected it (commonly a hostname not
  // registered for this site key). Surface the same phone fallback.
  if (errored) {
    return unavailableNotice;
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
      <div ref={ref} className={className} />
    </>
  );
}
