// Server + edge Sentry initialization. Next.js 16 calls this once per
// runtime before any other code; we branch on the runtime tag and delegate
// to a runtime-specific config so each one initializes with the right
// integrations (the browser side is handled separately by
// instrumentation-client.ts).
//
// Sentry init is gated by NEXT_PUBLIC_SENTRY_DSN — when the DSN isn't set
// (local dev, preview deploys before secrets land), Sentry no-ops cleanly.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture caught request errors and forward to Sentry. Next.js 15+ hands
// these to the instrumentation hook automatically.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
