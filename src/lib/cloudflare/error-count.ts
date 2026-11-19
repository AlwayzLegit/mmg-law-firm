/**
 * The site counts its own server errors (OPS-21).
 *
 * The Worker entry (cloudflare/worker.ts) calls this for every response with a
 * 5xx status. It stores a count per environment, route group and hour in the
 * database (supabase/migrations/0040_error_counts.sql) and nothing else: no
 * path, no query string, no address, no header, nothing a visitor typed. The
 * route group is cut down to at most two lowercase words.
 *
 * Pure module: no "server-only", no Next import, no Node import, so the Worker
 * entry can load it like its neighbours. It never throws and never logs the
 * key, the URL or an answer: a failed count is dropped, because a count is a
 * hint and the response it describes has already gone out.
 */

export type ErrorCountEnv = "production" | "staging";

/** At most this many counts a minute per Worker instance; the rest are dropped. */
export const MAX_COUNTS_PER_MINUTE = 20;
export const COUNT_TIMEOUT_MS = 2_000;

/** One path segment kept in a route group: lowercase letters and hyphens only. */
const KEPT_SEGMENT = /^[a-z]+(?:-[a-z]+)*$/;
const MAX_SEGMENT = 30;

/**
 * The route group of a path, never more than two segments:
 * /api/leads/anything becomes /api/leads, /api/admin/leads/[id] becomes
 * /api/admin, /admin/leads/[id] becomes /admin, every other path becomes /page.
 * An /api segment that is not plain lowercase words becomes /api/other, so an
 * address or an id in a path can never reach the table.
 */
export function routeGroup(pathname: string): string {
  const path = String(pathname ?? "").split(/[?#]/)[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  const first = segments[0];
  if (first === "admin") return "/admin";
  if (first === "api") {
    const second = segments[1];
    if (second && second.length <= MAX_SEGMENT && KEPT_SEGMENT.test(second)) {
      return `/api/${second}`;
    }
    return "/api/other";
  }
  return "/page";
}

/**
 * True for the site's own background page refresh (OPS-185): a HEAD request with
 * x-isr: 1 and a non-empty x-prerender-revalidate header.
 *
 * Who sends it: OpenNext's revalidation queue (open-next.config.ts uses doQueue),
 * through the WORKER_SELF_REFERENCE binding to this same Worker
 * (@opennextjs/cloudflare 1.20.13, dist/api/durable-objects/queue.js,
 * executeRevalidation). On a 500 it retries up to 6 times, so one failing page
 * can answer 5xx seven times. The stored page keeps serving meanwhile
 * (stale-while-revalidate), so no visitor sees the error: it is a cause to log,
 * not a symptom to count.
 */
export function isBackgroundRevalidation(request: Request): boolean {
  if (request.method !== "HEAD") return false;
  if (request.headers.get("x-isr") !== "1") return false;
  const marker = request.headers.get("x-prerender-revalidate");
  return marker !== null && marker !== "";
}

/** A server error: status 500 to 599. */
export function shouldCount(status: number): boolean {
  return Number.isInteger(status) && status >= 500 && status <= 599;
}

/**
 * Wraps one answer of the Worker. Calls record(status) once when the answer is a
 * 5xx, or when respond() throws (counted as 500, then the error is thrown again
 * unchanged). The response is returned as it came, the same object: its body is
 * never read or cloned. A record() that throws changes nothing for the visitor.
 */
export async function withErrorCount(
  respond: () => Promise<Response>,
  record: (status: number) => void,
): Promise<Response> {
  const safe = (status: number) => {
    try {
      record(status);
    } catch {
      // Counting must never change what the visitor gets.
    }
  };
  let res: Response;
  try {
    res = await respond();
  } catch (err) {
    safe(500);
    throw err;
  }
  if (shouldCount(res.status)) safe(res.status);
  return res;
}

/** "staging" when the site address is on a staging. host, else "production". */
export function envName(siteUrl: string | undefined): ErrorCountEnv {
  try {
    return new URL(String(siteUrl ?? "")).hostname.startsWith("staging.")
      ? "staging"
      : "production";
  } catch {
    return "production";
  }
}

export type CounterOptions = {
  /** The Supabase project address (NEXT_PUBLIC_SUPABASE_URL). */
  url?: string;
  /** The service role key (SUPABASE_SERVICE_ROLE_KEY). Only ever sent to that address. */
  key?: string;
  env: ErrorCountEnv;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export type Counter = {
  /** Adds one for this path's route group. Resolves always, never throws. */
  count(pathname: string): Promise<void>;
};

export function makeCounter(options: CounterOptions): Counter {
  const { url, key, env } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  let windowStart = 0;
  let inWindow = 0;

  return {
    async count(pathname: string): Promise<void> {
      if (!url || !key) return;
      const t = now();
      if (t - windowStart >= 60_000) {
        windowStart = t;
        inWindow = 0;
      }
      // Above this many a minute the alarm has long been on: drop the rest.
      if (inWindow >= MAX_COUNTS_PER_MINUTE) return;
      inWindow += 1;
      try {
        const res = await fetchImpl(
          `${url.replace(/\/+$/, "")}/rest/v1/rpc/bump_error_count`,
          {
            method: "POST",
            headers: {
              apikey: key,
              authorization: `Bearer ${key}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ p_env: env, p_route: routeGroup(pathname) }),
            signal: AbortSignal.timeout(COUNT_TIMEOUT_MS),
          },
        );
        // The answer is never read; let the connection go.
        await res?.body?.cancel?.();
      } catch {
        // Dropped on purpose: no log line may hold the key, the address or an answer.
      }
    },
  };
}
