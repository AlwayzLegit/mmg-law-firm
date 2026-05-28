"use client";

import * as React from "react";
import Script from "next/script";

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

  // Dev fallback: if no site key configured, set a placeholder token immediately.
  React.useEffect(() => {
    if (!siteKey) {
      onToken("dev-no-turnstile");
    }
  }, [siteKey, onToken]);

  React.useEffect(() => {
    if (!siteKey || !loaded || !ref.current || !window.turnstile) return;
    const id = window.turnstile.render(ref.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      callback: (token) => onToken(token),
      "error-callback": () => onToken(""),
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

  if (!siteKey) {
    // In dev we surface the missing-key reason out loud so the developer
    // knows the form is in stub mode. In production a visitor never sees
    // that — they get nothing where the widget would render, so the form
    // looks normal. Submission will fail server-side (turnstile-secret-
    // missing) and the form's onSubmit catch shows the user-facing error.
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
    return null;
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
