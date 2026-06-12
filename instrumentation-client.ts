import * as Sentry from "@sentry/nextjs";

// Client-side Sentry init runs once per page load. Gated by the DSN so
// builds without Sentry env vars produce no client payload weight.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Browser-side tracing is enabled at a low rate — enough to spot
    // regressions, light enough to not bloat the client bundle's event
    // queue. Adjust upward once a baseline exists.
    tracesSampleRate: 0.1,
    // Replay is OFF: privacy-sensitive site (lead form, TCPA consent,
    // accident narratives). Can be enabled later with privacy-mask config.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
}

// Next.js 16 hands router transition spans to this hook for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
