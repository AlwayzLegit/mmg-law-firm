import type { D1Like } from "@/lib/db/d1Client";

/**
 * One-time invite and password-reset tokens for the Better Auth path
 * (OPS-365). A token is 32 random bytes; only its SHA-256 is stored, as the
 * `identifier` of an auth_verifications row whose `value` is the user id. The
 * link is single use (the row is deleted when it is read) and expires:
 * recovery in 1 hour, invite and magic link in 72 hours.
 *
 * Supabase's invite and recovery links today expire after the project's OTP
 * expiry (the invite mail says one hour). An invite that has to be re-sent
 * after an hour is why the invite lifetime is longer here: the Admins list has
 * "Resend invite" and "Copy invite link" either way.
 */
export const LINK_TYPES = ["invite", "magiclink", "recovery"] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export const LINK_TTL_SECONDS: Record<LinkType, number> = {
  invite: 72 * 60 * 60,
  magiclink: 72 * 60 * 60,
  recovery: 60 * 60,
};

const PREFIX = "mmg-link";

export function isLinkType(value: string | null | undefined): value is LinkType {
  return LINK_TYPES.includes(value as LinkType);
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function newLinkToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function linkIdentifier(type: LinkType, token: string): Promise<string> {
  return `${PREFIX}:${type}:${await sha256Hex(token)}`;
}

/**
 * Store a new token for a user and return it (the only time it exists in the
 * clear). Earlier unused tokens of the same type for the same user are
 * deleted, so "Resend invite" retires the old link.
 */
export async function issueLink(
  db: D1Like,
  input: { userId: string; type: LinkType; now?: Date },
): Promise<{ token: string; expiresAt: string }> {
  const now = input.now ?? new Date();
  const token = newLinkToken();
  const identifier = await linkIdentifier(input.type, token);
  const expiresAt = new Date(now.getTime() + LINK_TTL_SECONDS[input.type] * 1000).toISOString();
  await db
    .prepare("DELETE FROM auth_verifications WHERE value = ? AND identifier LIKE ?")
    .bind(input.userId, `${PREFIX}:${input.type}:%`)
    .run();
  await db
    .prepare("INSERT INTO auth_verifications (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), identifier, input.userId, expiresAt, now.toISOString(), now.toISOString())
    .run();
  return { token, expiresAt };
}

/**
 * Read a token once. The row is deleted by the same statement that reads it,
 * so two requests with the same token cannot both succeed. Returns the user id
 * or null for an unknown, used or expired token.
 */
export async function consumeLink(
  db: D1Like,
  input: { token: string; type: LinkType; now?: Date },
): Promise<string | null> {
  const identifier = await linkIdentifier(input.type, input.token);
  const { results } = await db
    .prepare("DELETE FROM auth_verifications WHERE identifier = ? RETURNING value, expires_at")
    .bind(identifier)
    .all<{ value: string; expires_at: string }>();
  const row = results[0];
  if (!row) return null;
  const now = input.now ?? new Date();
  if (!(new Date(row.expires_at).getTime() > now.getTime())) return null;
  return row.value;
}
