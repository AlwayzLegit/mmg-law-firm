/**
 * Tiny analytics facade for client components.
 *
 * Events are pushed onto a window-level queue and announced with a custom
 * event. The PostHog runtime (loaded after the page is idle) drains the queue
 * when it initialises and listens for later events — so callers never import
 * posthog-js and nothing is lost if the SDK arrives late or not at all.
 */
export type TrackedEvent = [name: string, props?: Record<string, unknown>];

declare global {
  interface Window {
    __mmgTrackQueue?: TrackedEvent[];
  }
}

export const TRACK_EVENT = "mmg:track";

export function track(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  (window.__mmgTrackQueue ??= []).push([name, props]);
  window.dispatchEvent(new CustomEvent(TRACK_EVENT));
}

/** Remove and return every queued event (used by the PostHog runtime). */
export function drainTrackQueue(): TrackedEvent[] {
  if (typeof window === "undefined") return [];
  const q = window.__mmgTrackQueue ?? [];
  window.__mmgTrackQueue = [];
  return q;
}
