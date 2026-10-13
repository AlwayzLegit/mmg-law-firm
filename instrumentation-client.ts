// Client-side Sentry. The SDK is imported dynamically so it never sits in the
// startup bundle every page parses before it becomes interactive. When
// NEXT_PUBLIC_SENTRY_DSN is unset at build time the branch below is dead code
// and the SDK isn't shipped at all. Trade-off: an error thrown before the SDK
// finishes loading (typically well under a second) isn't reported.
type SentryModule = typeof import("@sentry/nextjs");

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let sentry: SentryModule | null = null;

if (dsn) {
  void import("@sentry/nextjs").then((Sentry) => {
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
    sentry = Sentry;
  });
}

// Next.js 16 hands router transition spans to this hook for tracing. It is a
// no-op until the SDK has loaded.
export function onRouterTransitionStart(
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
): void {
  sentry?.captureRouterTransitionStart(...args);
}
