import { createHash, randomBytes } from "node:crypto";

/**
 * API key token helpers. Pure functions — no I/O — so they're unit-testable.
 *
 * Token format: `mmg_<prefix8>_<secret>` where the prefix is a public lookup
 * handle (also shown in the admin UI) and the secret is 43 base64url chars.
 * Only `sha256(token)` is stored in `api_keys.key_hash`.
 */
export const TOKEN_RE = /^mmg_([A-Za-z0-9]{8})_([A-Za-z0-9_-]{32,})$/;

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function base62(bytes: Uint8Array, length: number): string {
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    out += BASE62[bytes[i] % BASE62.length];
  }
  return out;
}

export type GeneratedToken = { token: string; prefix: string; hash: string };

/** Mint a new token. The caller stores `prefix` + `hash`, shows `token` once. */
export function generateToken(): GeneratedToken {
  const prefix = base62(randomBytes(16), 8);
  const secret = randomBytes(32).toString("base64url");
  const token = `mmg_${prefix}_${secret}`;
  return { token, prefix, hash: hashToken(token) };
}

/** Extract the prefix from a well-formed token, or null. */
export function parseToken(token: string): { prefix: string } | null {
  const m = TOKEN_RE.exec(token.trim());
  return m ? { prefix: m[1] } : null;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}
