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
