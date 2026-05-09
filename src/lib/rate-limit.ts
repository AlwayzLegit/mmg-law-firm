/**
 * Naive in-memory rate limiter, keyed by IP. Survives only for the lifetime
 * of the serverless instance. Group D-E will swap this for a Postgres
 * `rate_limits` table or Upstash Redis once one is decided on.
 *
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfterSeconds }`.
 */
type Bucket = { count: number; firstAt: number };
const BUCKETS = new Map<string, Bucket>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(
  key: string,
  limit = 5,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = BUCKETS.get(key);

  if (!existing || now - existing.firstAt > WINDOW_MS) {
    BUCKETS.set(key, { count: 1, firstAt: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - existing.firstAt)) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}
