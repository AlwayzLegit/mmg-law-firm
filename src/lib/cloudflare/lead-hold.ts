/**
 * Held enquiries (OPS-398). The front Worker sits in front of POST /api/leads.
 * While the database is down the app answers 500 `db-insert-failed` (or does
 * not answer at all), and the enquiry is lost. This module catches exactly
 * those two outcomes on the front Worker, writes the enquiry to the private R2
 * bucket the Worker already binds, and answers the visitor with the normal
 * thank-you only after the copy is stored (fail closed).
 *
 * Standard: store-and-forward with idempotent replay (the outbox pattern).
 * Data minimisation and storage limitation for the held copy: it is kept only
 * to deliver the enquiry, and a lifecycle rule deletes it within 7 days. The
 * replay into `leads` is a separate row (OPS-399).
 *
 * What is held: the lead fields the form posted (without the Turnstile token)
 * and a consent record (time received, IP, user agent). A 500 `db-insert-failed`
 * proves the body already passed validation and Turnstile in the app. In the
 * timeout case that proof is missing, so the copy is deleted again as soon as
 * the app answers with a 4xx or with a stored lead.
 *
 * Relative imports only: this file is bundled by wrangler, not by Next.
 *
 * Logs are fixed words. Never a lead field, the IP or the object key.
 */

export const HOLD_PREFIX = "held-leads/";
export const MAX_BODY_BYTES = 32_768;
export const APP_DEADLINE_MS = 15_000;
export const LATE_WAIT_MS = 25_000;

export type HoldBucket = {
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<unknown>;
};

/** The app's service binding (structural: the Workers types are not loaded for src/). */
export type AppBinding = { fetch(request: Request): Promise<Response> };

export type HoldContext = { waitUntil(promise: Promise<unknown>): void };

export type HoldEnv = {
  /** The app Worker. */
  APP: AppBinding;
  /** The private R2 bucket (mmg-law-firm-cache, or its staging twin). */
  PAGES: HoldBucket;
  /** "1" on staging only: enables the self test below. */
  HOLD_SELFTEST?: string;
};

export type HeldLead = {
  v: 1;
  receivedAt: string;
  reason: "db-insert-failed" | "app-timeout";
  lead: Record<string, unknown>;
  consent: { ip: string | null; userAgent: string | null };
};

const STAGING_HOST = "staging.mmg-lawfirm.com";
const SELFTEST_HEADER = "x-hold-selftest";

const TIMEOUT = Symbol("timeout");

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** First client address the platform reports; nothing else is read. */
function clientIp(request: Request): string | null {
  const direct = request.headers.get("cf-connecting-ip");
  if (direct) return direct.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function withBody(request: Request, text: string): Request {
  return new Request(request.url, { method: request.method, headers: request.headers, body: text });
}

function heldRecord(
  request: Request,
  lead: Record<string, unknown>,
  reason: HeldLead["reason"],
  receivedAt: Date,
): HeldLead {
  const { turnstileToken: _token, ...rest } = lead;
  void _token;
  return {
    v: 1,
    receivedAt: receivedAt.toISOString(),
    reason,
    lead: rest,
    consent: { ip: clientIp(request), userAgent: request.headers.get("user-agent") },
  };
}

function heldKey(receivedAt: Date): string {
  const day = receivedAt.toISOString().slice(0, 10);
  return `${HOLD_PREFIX}${day}/${crypto.randomUUID()}.json`;
}

async function store(bucket: HoldBucket, key: string, record: HeldLead): Promise<boolean> {
  try {
    await bucket.put(key, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    console.warn(`[lead-hold] held reason=${record.reason}`);
    return true;
  } catch {
    console.warn("[lead-hold] put failed");
    return false;
  }
}

/** `{ ok: true, persisted: false }`: the form shows the thank-you; not counted as stored. */
function thankYou(extra: Record<string, unknown> = {}): Response {
  return json({ ok: true, persisted: false, ...extra }, 200);
}

async function isInsertFailure(res: Response): Promise<boolean> {
  if (res.status !== 500) return false;
  try {
    const body: unknown = await res.clone().json();
    return isPlainObject(body) && body.error === "db-insert-failed";
  } catch {
    return false;
  }
}

/** After a timeout hold: wait for the app's real answer and drop the copy if the app dealt with it. */
async function settleLate(
  app: Promise<Response>,
  bucket: HoldBucket,
  key: string,
  wait: (ms: number) => Promise<typeof TIMEOUT>,
): Promise<void> {
  let late: Response | typeof TIMEOUT;
  try {
    late = await Promise.race([app, wait(LATE_WAIT_MS)]);
  } catch {
    return;
  }
  if (late === TIMEOUT) return;
  let handled = false;
  if (late.status >= 400 && late.status < 500) {
    handled = true;
  } else if (late.status >= 200 && late.status < 300) {
    try {
      const body: unknown = await late.clone().json();
      handled = isPlainObject(body) && body.persisted === true;
    } catch {
      handled = false;
    }
  }
  if (!handled) return;
  try {
    await bucket.delete(key);
    console.warn(`[lead-hold] released status=${late.status}`);
  } catch {
    console.warn("[lead-hold] release failed");
  }
}

function timer(ms: number): { wait: Promise<typeof TIMEOUT>; cancel: () => void } {
  let id: ReturnType<typeof setTimeout> | undefined;
  const wait = new Promise<typeof TIMEOUT>((resolve) => {
    id = setTimeout(() => resolve(TIMEOUT), ms);
  });
  return { wait, cancel: () => clearTimeout(id) };
}

/** Staging only: proves the hold without a database fault. Never calls the app. */
async function selfTest(request: Request, env: HoldEnv, body: Record<string, unknown>, now: () => number): Promise<Response> {
  const receivedAt = new Date(now());
  const id = crypto.randomUUID();
  const key = `${HOLD_PREFIX}selftest/${id}.json`;
  const ok = await store(env.PAGES, key, heldRecord(request, body, "db-insert-failed", receivedAt));
  if (!ok) return json({ ok: false, error: "db-insert-failed" }, 500);
  return thankYou({ selftest: id });
}

export async function handleLeadPost(
  request: Request,
  env: HoldEnv,
  ctx: HoldContext,
  now: () => number = Date.now,
): Promise<Response> {
  const text = await request.text();
  const forward = () => env.APP.fetch(withBody(request, text));

  let parsed: unknown = null;
  if (new TextEncoder().encode(text).length <= MAX_BODY_BYTES) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }
  if (!isPlainObject(parsed)) return forward();

  if (
    env.HOLD_SELFTEST === "1" &&
    new URL(request.url).host === STAGING_HOST &&
    request.headers.get(SELFTEST_HEADER) === "1"
  ) {
    return selfTest(request, env, parsed, now);
  }

  const app = forward();
  const deadline = timer(APP_DEADLINE_MS);
  let first: Response | typeof TIMEOUT;
  try {
    first = await Promise.race([app, deadline.wait]);
  } catch (error) {
    deadline.cancel();
    throw error;
  }
  deadline.cancel();

  const receivedAt = new Date(now());

  if (first === TIMEOUT) {
    const key = heldKey(receivedAt);
    const ok = await store(env.PAGES, key, heldRecord(request, parsed, "app-timeout", receivedAt));
    if (!ok) {
      // Nothing was stored: the visitor must not be told "received".
      app.catch(() => undefined);
      return json({ ok: false, error: "db-insert-failed" }, 503);
    }
    ctx.waitUntil(settleLate(app, env.PAGES, key, (ms) => timer(ms).wait));
    return thankYou();
  }

  if (!(await isInsertFailure(first))) return first;

  const ok = await store(env.PAGES, heldKey(receivedAt), heldRecord(request, parsed, "db-insert-failed", receivedAt));
  return ok ? thankYou() : first;
}
