import { captureRouterTransitionStart, init } from "@sentry/nextjs";

export { captureException, captureRouterTransitionStart } from "@sentry/nextjs";

// Only the named initialization, transition and boundary-capture exports are used.
// A separate adapter lets the bundler omit unused optional integrations.
export function initializeClientMonitoring(
  dsn: string,
  environment: string | undefined,
): typeof captureRouterTransitionStart {
  init({
    dsn,
    environment,
    // Errors only. Browser performance tracing is off (owner decision,
    // 2026-11-09): its instrumentation ran on every phone to sample 10% of
    // page loads, and the Lighthouse workflow already measures page speed.
    // Server tracing (sentry.server.config.ts) is unchanged, which is why
    // this is not the build's `removeTracing` flag: that flag strips tracing
    // from the server bundles too. The webpack (Worker) build drops the
    // browser tracing code itself (next.config.ts); this filter covers
    // builds where that code is still present (Turbopack, tests).
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== "BrowserTracing"),
    // Replay stays OFF on this privacy-sensitive site.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  });
  return captureRouterTransitionStart;
}
