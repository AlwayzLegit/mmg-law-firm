import { describe, expect, it } from "vitest";

import { generateToken, hashToken, parseToken, TOKEN_RE } from "./api-keys";

describe("api key tokens", () => {
  it("generates a well-formed token whose hash matches", () => {
    const t = generateToken();
    expect(TOKEN_RE.test(t.token)).toBe(true);
    expect(t.prefix).toHaveLength(8);
    expect(parseToken(t.token)?.prefix).toBe(t.prefix);
    expect(hashToken(t.token)).toBe(t.hash);
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).not.toBe(b.token);
    expect(a.prefix).not.toBe(b.prefix);
  });

  it("rejects malformed tokens", () => {
    expect(parseToken("")).toBeNull();
    expect(parseToken("mmg_short_x")).toBeNull();
    expect(parseToken("other_prefix_abcdefghijklmnopqrstuvwxyz0123456789")).toBeNull();
    expect(parseToken("mmg_ABCDEFGH_" + "a".repeat(31))).toBeNull();
    expect(parseToken("mmg_ABCDEFGH_" + "a".repeat(32))).not.toBeNull();
  });

  it("hash is stable and whitespace-tolerant", () => {
    const t = generateToken();
    expect(hashToken(`  ${t.token}\n`)).toBe(t.hash);
  });
});
