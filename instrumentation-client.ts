// Client-side Sentry. The runtime is imported dynamically so it never sits in the
// startup bundle every page parses before it becomes interactive. When
// NEXT_PUBLIC_SENTRY_DSN is unset at build time the branch below is dead code
// and the SDK isn't shipped at all. Trade-off: an error thrown before the SDK
// finishes loading (typically well under a second) isn't reported.
type CaptureTransition =
  (typeof import("@sentry/nextjs"))["captureRouterTransitionStart"];

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
let captureTransition: CaptureTransition | null = null;

if (dsn) {
  // Keep the SDK namespace inside a named-import adapter. Retaining the
  // entire dynamic SDK namespace also retains unused integrations (including
  // Replay) in the browser bundle even though recording is disabled.
  void import("./src/lib/monitoring/sentry-client").then(
    ({ initializeClientMonitoring }) => {
      captureTransition = initializeClientMonitoring(
        dsn,
        process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
      );
    },
  );
}

// Next.js 16 hands router transition spans to this hook for tracing. It is a
// no-op until the SDK has loaded.
export function onRouterTransitionStart(
  ...args: Parameters<CaptureTransition>
): void {
  captureTransition?.(...args);
}
