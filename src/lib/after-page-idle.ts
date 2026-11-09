type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Run `task` once the page has loaded and the main thread goes idle (or
 * after `timeout` ms of waiting for idle), so optional SDKs never compete
 * with hydration or the LCP on phones. Returns a cancel function.
 *
 * Outside a browser (unit tests, server code) the task runs immediately.
 */
export function afterPageIdle(task: () => void, timeout = 4000): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    task();
    return () => {};
  }
  const w = window as IdleWindow;
  let cancelled = false;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (!cancelled) task();
  };
  const schedule = () => {
    if (cancelled) return;
    if (typeof w.requestIdleCallback === "function")
      idle = w.requestIdleCallback(run, { timeout });
    else timer = setTimeout(run, Math.min(timeout, 2500));
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idle !== undefined) w.cancelIdleCallback?.(idle);
    if (timer !== undefined) clearTimeout(timer);
  };
}

/** Signs that a person is using the page. google-init.ts keeps its own copy. */
export const INTERACTION_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

/**
 * Run `task` after the visitor first touches, scrolls, types or moves the
 * mouse (then once the main thread is idle), or after `fallback` ms for a
 * visitor who only reads. Analytics SDKs use this: loaded on a timer they
 * cost phones 0.5-1 s of main-thread work right after the page appears.
 * A visitor who leaves within `fallback` ms without interacting never loads
 * them (owner-approved trade-off, 2026-11-09). Returns a cancel function.
 *
 * Outside a browser (unit tests, server code) the task runs immediately.
 */
export function afterFirstInteraction(
  task: () => void,
  fallback = 20000,
): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    task();
    return () => {};
  }
  const opts = { capture: true, passive: true } as const;
  let started = false;
  let cancelIdle = () => {};
  const stop = () => {
    for (const name of INTERACTION_EVENTS)
      window.removeEventListener(name, start, opts);
    clearTimeout(timer);
  };
  function start() {
    if (started) return;
    started = true;
    stop();
    // Not inside the event handler: the tap or scroll must stay responsive.
    cancelIdle = afterPageIdle(task, 2000);
  }
  for (const name of INTERACTION_EVENTS)
    window.addEventListener(name, start, opts);
  const timer = setTimeout(start, fallback);
  return () => {
    started = true;
    stop();
    cancelIdle();
  };
}
