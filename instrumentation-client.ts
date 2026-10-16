import {
  getLoadedClientMonitoring,
  loadClientMonitoring,
  reportMonitoringLoadFailure,
} from "./src/lib/monitoring/load-client-monitoring";

// Begin loading at startup as before. Public error boundaries await the same
// initialization instead of pulling another static SDK chunk into every page.
// Uncaught errors before the SDK loads retain the existing monitoring gap;
// errors handled by the public boundaries can now wait for SDK readiness.
type CaptureTransition =
  (typeof import("@sentry/nextjs"))["captureRouterTransitionStart"];

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  void loadClientMonitoring().catch(reportMonitoringLoadFailure);
}

// Next.js 16 hands router transition spans to this hook for tracing. It is a
// no-op until the SDK has loaded.
export function onRouterTransitionStart(
  ...args: Parameters<CaptureTransition>
): void {
  getLoadedClientMonitoring()?.captureRouterTransitionStart(...args);
}
