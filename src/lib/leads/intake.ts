/**
 * Pure helpers for the public lead intake route. Kept free of request/DB
 * objects so the security-sensitive logic — IP parsing, HTML escaping, and
 * server-side spam detection — is unit-testable in isolation.
 */

// Accept only plausible IPv4/IPv6 shapes so a forged header can't poison the
// rate-limit key or the audit_log payload.
const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;

const URL_RE = /(https?:\/\/|www\.)/i;
const URL_RE_GLOBAL = /(https?:\/\/|www\.)/gi;

/**
 * Resolve a client IP from proxy headers. Prefers the first hop of
 * `x-forwarded-for`, falls back to `x-real-ip`, and returns "unknown" for
 * anything missing or that doesn't look like an IP.
 */
export function parseClientIp(
  forwardedFor: string | null,
  realIp: string | null,
): string {
  const raw = forwardedFor
    ? forwardedFor.split(",")[0]?.trim()
    : (realIp ?? null);
  if (!raw) return "unknown";
  const candidate = raw.slice(0, 45);
  return IP_RE.test(candidate) ? candidate : "unknown";
}

/** Escape the five HTML-significant characters for safe email interpolation. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Server-side spam heuristic, applied after schema validation. Routes a
 * submission to status='spam' (without notifying) when the honeypot field is
 * filled, the description carries 3+ URLs, or the name contains a URL. The
 * honeypot in particular is intentionally NOT rejected by the Zod schema —
 * we silently accept-and-flag bots rather than 400 them.
 */
export function detectSpam(input: {
  fullName: string;
  description?: string | null;
  company?: string | null;
}): boolean {
  const urlsInDesc =
    (input.description ?? "").match(URL_RE_GLOBAL)?.length ?? 0;
  const honeypotTripped = (input.company ?? "").trim() !== "";
  return honeypotTripped || urlsInDesc >= 3 || URL_RE.test(input.fullName);
}
