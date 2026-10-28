import { afterPageIdle } from "./src/lib/after-page-idle";
import {
  getLoadedClientMonitoring,
  loadClientMonitoring,
  reportMonitoringLoadFailure,
} from "./src/lib/monitoring/load-client-monitoring";

// Load the ~64 KB SDK once the page is idle rather than during hydration,
// where it cost phones ~130 ms of main-thread work. Public error boundaries
// await the same initialization (and start it at once if it hasn't begun).
// Uncaught errors before the SDK loads remain the existing monitoring gap.
type CaptureTransition =
  (typeof import("@sentry/nextjs"))["captureRouterTransitionStart"];

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  afterPageIdle(() => {
    void loadClientMonitoring().catch(reportMonitoringLoadFailure);
  });
}

// Next.js 16 hands router transition spans to this hook for tracing. It is a
// no-op until the SDK has loaded.
export function onRouterTransitionStart(
  ...args: Parameters<CaptureTransition>
): void {
  getLoadedClientMonitoring()?.captureRouterTransitionStart(...args);
}
