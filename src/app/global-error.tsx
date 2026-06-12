"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import * as React from "react";

// Root-level error boundary. Next.js mounts this only for errors that
// escape every other layer; Sentry captures the error before we render
// a minimal recovery UI so the user has somewhere to go.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "2rem",
          background: "#fafafa",
          color: "#0a0c10",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#2b46d8",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              marginTop: 12,
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.15,
            }}
          >
            We hit an unexpected error. Sorry about that.
          </h1>
          <p style={{ marginTop: 16, color: "#52525b", lineHeight: 1.55 }}>
            The team has been notified. You can try again, or go back to the
            homepage and call us if your issue is urgent.
          </p>
          <div
            style={{
              marginTop: 24,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#2b46d8",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                color: "#2b46d8",
                textDecoration: "none",
                padding: "10px 18px",
                fontWeight: 600,
              }}
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
