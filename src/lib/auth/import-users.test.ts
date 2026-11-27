import { describe, expect, it } from "vitest";

import { authRowsFromSupabase } from "@/lib/auth/import-users";

const BCRYPT = "$2a$10$" + "a".repeat(53);
const NOW = new Date("2026-11-27T20:00:00.000Z");

describe("authRowsFromSupabase", () => {
  const users = [
    { id: "u-bcrypt", email: "Owner@Example.com ", encrypted_password: BCRYPT, email_confirmed_at: "2026-01-01T00:00:00Z", raw_user_meta_data: { full_name: " Mihran " }, created_at: "2026-01-01T00:00:00Z" },
    { id: "u-nohash", email: "invited@example.com", encrypted_password: "", email_confirmed_at: null },
    { id: "u-argon", email: "argon@example.com", encrypted_password: "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG", email_confirmed_at: "2026-01-01T00:00:00Z", banned_until: "2099-01-01T00:00:00Z" },
  ];
  const out = authRowsFromSupabase(users, NOW);

  it("returns a user row for each user and an account only for a bcrypt hash", () => {
    expect(out.users.map((u) => u.id)).toEqual(["u-bcrypt", "u-nohash", "u-argon"]);
    expect(out.accounts).toHaveLength(1);
    expect(out.accounts[0]).toMatchObject({ user_id: "u-bcrypt", account_id: "u-bcrypt", provider_id: "credential", password: BCRYPT });
  });

  it("lists the two users who need a new invite", () => {
    expect(out.needInvite).toEqual(["u-nohash", "u-argon"]);
  });

  it("keeps the Supabase user id and normalizes the email, name, verified flag and ban", () => {
    expect(out.users[0]).toMatchObject({ id: "u-bcrypt", email: "owner@example.com", name: "Mihran", email_verified: 1, banned_until: null });
    expect(out.users[1]).toMatchObject({ email_verified: 0, name: "" });
    expect(out.users[2].banned_until).toBe("2099-01-01T00:00:00.000Z");
  });

  it("skips a user with no email", () => {
    expect(authRowsFromSupabase([{ id: "x", email: null }], NOW).users).toEqual([]);
  });

  it.each(["$2b$12$" + "b".repeat(53), "$2y$10$" + "c".repeat(53)])("accepts the bcrypt prefix of %s", (hash) => {
    expect(authRowsFromSupabase([{ id: "u", email: "a@b.co", encrypted_password: hash }], NOW).accounts).toHaveLength(1);
  });

  it("refuses a truncated or other-format hash", () => {
    expect(authRowsFromSupabase([{ id: "u", email: "a@b.co", encrypted_password: "$2a$10$tooshort" }], NOW).accounts).toHaveLength(0);
    expect(authRowsFromSupabase([{ id: "u", email: "a@b.co", encrypted_password: "plaintext" }], NOW).accounts).toHaveLength(0);
  });
});
