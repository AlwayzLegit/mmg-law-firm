import { captureRouterTransitionStart, init } from "@sentry/nextjs";

export { captureException, captureRouterTransitionStart } from "@sentry/nextjs";

// Only the named initialization, tracing and boundary-capture exports are used.
// A separate adapter lets the bundler omit unused optional integrations.
export function initializeClientMonitoring(
  dsn: string,
  environment: string | undefined,
): typeof captureRouterTransitionStart {
  init({
    dsn,
    environment,
    // Retain the existing browser performance sampling and default error
    // integrations. This is a bundle change, not a monitoring-policy change.
    tracesSampleRate: 0.1,
    // Replay stays OFF on this privacy-sensitive site.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
  return captureRouterTransitionStart;
}
