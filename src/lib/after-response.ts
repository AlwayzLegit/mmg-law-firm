import "server-only";

import { after } from "next/server";

/**
 * Run work after the response is sent, without letting the platform kill it.
 *
 * `void somePromise` is not enough. On Vercel the function happens to stay
 * alive long enough, but a Cloudflare Worker cancels anything still pending
 * once the response is returned, so lead notifications and audit rows were
 * silently dropped on the staging Worker (2026-10-25). `after()` hands the
 * work to the platform's `waitUntil` (Vercel and OpenNext both implement it),
 * which keeps the invocation alive until it settles.
 *
 * Outside a request scope (unit tests, scripts) `after()` throws; the task
 * then runs immediately instead, so callers never have to care. Errors are
 * the task's own business: wrap them inside it, this helper only logs what
 * escapes.
 */
export function runAfterResponse(label: string, task: () => Promise<unknown>): void {
  const guarded = async () => {
    try {
      await task();
    } catch (err) {
      console.warn(`[after:${label}]`, err instanceof Error ? err.message : err);
    }
  };
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
