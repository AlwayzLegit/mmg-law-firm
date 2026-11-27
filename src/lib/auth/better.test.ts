import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";

import { assertSecret, buildBetterAuth, clientIp, type BetterAuthInstance } from "@/lib/auth/better";
import { authRowsFromSupabase } from "@/lib/auth/import-users";
import { consumeLink, issueLink, linkIdentifier } from "@/lib/auth/links";
import { nodeD1 } from "@/test/node-d1";

// Better Auth against the real D1 schema (migrations/d1/0001 and 0002) in
// Node's built-in SQLite. The Worker runs the same code against D1; the
// "D1 data layer" CI job repeats the sign-in and the one-time link on wrangler's
// local D1 (src/lib/db/d1Smoke.test.ts, "d1 smoke: 9 of 9").

const ROOT = join(__dirname, "../../..");
const SECRET = "test-secret-test-secret-test-secret-0123456789";
const PASSWORD = "correct horse battery";
const OWNER = "11111111-1111-4111-8111-111111111111";
const NO_PROFILE = "22222222-2222-4222-8222-222222222222";
const BANNED = "33333333-3333-4333-8333-333333333333";

let raw: DatabaseSync;
let auth: BetterAuthInstance;
let allowed: boolean;

function cookieHeader(headers: Headers): string {
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function signIn(email: string, password = PASSWORD) {
  return auth.api.signInEmail({ body: { email, password }, headers: new Headers({ "x-forwarded-for": "203.0.113.9" }), returnHeaders: true });
}

function sessionCount(userId: string): number {
  return Number((raw.prepare("SELECT COUNT(*) AS n FROM auth_sessions WHERE user_id = ?").get(userId) as { n: number }).n);
}

beforeEach(() => {
  raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync(join(ROOT, "migrations/d1/0001_schema.sql"), "utf8"));
  raw.exec(readFileSync(join(ROOT, "migrations/d1/0002_auth.sql"), "utf8"));
  const hash = bcrypt.hashSync(PASSWORD, 4);
  const { users, accounts } = authRowsFromSupabase(
    [
      { id: OWNER, email: "owner@mmg.test", encrypted_password: hash, email_confirmed_at: "2026-01-01T00:00:00Z", raw_user_meta_data: { full_name: "Owner" } },
      { id: NO_PROFILE, email: "visitor@mmg.test", encrypted_password: hash, email_confirmed_at: "2026-01-01T00:00:00Z" },
      { id: BANNED, email: "banned@mmg.test", encrypted_password: hash, email_confirmed_at: "2026-01-01T00:00:00Z", banned_until: "2099-01-01T00:00:00Z" },
    ],
    new Date(),
  );
  for (const u of users) raw.prepare("INSERT INTO auth_users (id, email, name, email_verified, banned_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(u.id, u.email, u.name, u.email_verified, u.banned_until, u.created_at, u.updated_at);
  for (const a of accounts) raw.prepare("INSERT INTO auth_accounts (id, user_id, account_id, provider_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(a.id, a.user_id, a.account_id, a.provider_id, a.password, a.created_at, a.updated_at);
  raw.prepare("INSERT INTO admin_profiles (user_id, role, full_name, password_set) VALUES (?, 'owner', 'Owner', 1)").run(OWNER);
  raw.prepare("INSERT INTO admin_profiles (user_id, role, full_name, password_set) VALUES (?, 'staff', 'Banned', 1)").run(BANNED);
  allowed = true;
  auth = buildBetterAuth({ database: raw, db: nodeD1(raw), secret: SECRET, secure: false, allow: async () => allowed });
});

describe("secret and helpers", () => {
  it("refuses a missing or short secret", () => {
    expect(() => assertSecret(undefined)).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => assertSecret("short")).toThrow(/at least 32/);
    expect(assertSecret(SECRET)).toBe(SECRET);
    expect(() => buildBetterAuth({ database: raw, db: nodeD1(raw), secret: "x".repeat(31), secure: false, allow: async () => true })).toThrow();
  });

  it("reads the client address from Cloudflare's header first", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "198.51.100.1", "x-forwarded-for": "203.0.113.1" }))).toBe("198.51.100.1");
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" }))).toBe("203.0.113.1");
    expect(clientIp(null)).toBe("unknown");
  });
});

describe("sign-in with an imported Supabase user", () => {
  it("signs in with the right password and opens a session that getSession reads", async () => {
    const { headers, response } = await signIn("owner@mmg.test");
    expect(response.user.id).toBe(OWNER);
    expect(sessionCount(OWNER)).toBe(1);
    const cookie = cookieHeader(headers);
    expect(cookie).toContain("mmg.session_token=");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user).toMatchObject({ id: OWNER, email: "owner@mmg.test" });
  });

  it("is case-insensitive on the email", async () => {
    const { response } = await signIn("OWNER@mmg.test");
    expect(response.user.id).toBe(OWNER);
  });

  it("refuses a wrong password, with no session", async () => {
    await expect(signIn("owner@mmg.test", "not the password")).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(sessionCount(OWNER)).toBe(0);
  });

  it("refuses an unknown email the same way", async () => {
    await expect(signIn("nobody@mmg.test")).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it("opens no session for a user with no admin_profiles row", async () => {
    await expect(signIn("visitor@mmg.test")).rejects.toMatchObject({ body: { code: "FAILED_TO_CREATE_SESSION" } });
    expect(sessionCount(NO_PROFILE)).toBe(0);
  });

  it("opens no session for a banned user", async () => {
    await expect(signIn("banned@mmg.test")).rejects.toMatchObject({ body: { code: "FAILED_TO_CREATE_SESSION" } });
    expect(sessionCount(BANNED)).toBe(0);
  });

  it("refuses when the rate limit says no", async () => {
    allowed = false;
    await expect(signIn("owner@mmg.test")).rejects.toMatchObject({ status: "TOO_MANY_REQUESTS" });
    expect(sessionCount(OWNER)).toBe(0);
  });

  it("has no self sign-up", async () => {
    await expect(auth.api.signUpEmail({ body: { email: "new@mmg.test", password: PASSWORD, name: "New" } })).rejects.toBeTruthy();
    expect(raw.prepare("SELECT COUNT(*) AS n FROM auth_users WHERE email = 'new@mmg.test'").get()).toEqual({ n: 0 });
  });

  it("ends the session on sign-out", async () => {
    const { headers } = await signIn("owner@mmg.test");
    const h = new Headers({ cookie: cookieHeader(headers) });
    await auth.api.signOut({ headers: h });
    expect(sessionCount(OWNER)).toBe(0);
    expect(await auth.api.getSession({ headers: h, query: { disableCookieCache: true } })).toBeNull();
  });
});

describe("one-time links", () => {
  const db = () => nodeD1(raw);

  it("stores only a hash of the token", async () => {
    const { token } = await issueLink(db(), { userId: OWNER, type: "recovery" });
    const rows = raw.prepare("SELECT identifier, value FROM auth_verifications").all() as { identifier: string; value: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].identifier).toBe(await linkIdentifier("recovery", token));
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(rows[0].value).toBe(OWNER);
  });

  it("works once and is refused the second time", async () => {
    const { token } = await issueLink(db(), { userId: OWNER, type: "recovery" });
    expect(await consumeLink(db(), { token, type: "recovery" })).toBe(OWNER);
    expect(await consumeLink(db(), { token, type: "recovery" })).toBeNull();
  });

  it("is refused after its expiry (recovery 1 hour, invite 72 hours)", async () => {
    const now = new Date("2026-11-27T20:00:00.000Z");
    const rec = await issueLink(db(), { userId: OWNER, type: "recovery", now });
    expect(rec.expiresAt).toBe("2026-11-27T21:00:00.000Z");
    expect(await consumeLink(db(), { token: rec.token, type: "recovery", now: new Date("2026-11-27T21:00:01.000Z") })).toBeNull();
    const inv = await issueLink(db(), { userId: OWNER, type: "invite", now });
    expect(inv.expiresAt).toBe("2026-11-30T20:00:00.000Z");
    expect(await consumeLink(db(), { token: inv.token, type: "invite", now: new Date("2026-11-30T19:59:00.000Z") })).toBe(OWNER);
  });

  it("is refused for another type or a made-up token", async () => {
    const { token } = await issueLink(db(), { userId: OWNER, type: "recovery" });
    expect(await consumeLink(db(), { token, type: "invite" })).toBeNull();
    expect(await consumeLink(db(), { token: "x".repeat(43), type: "recovery" })).toBeNull();
    expect(await consumeLink(db(), { token, type: "recovery" })).toBe(OWNER);
  });

  it("retires the older link when a new one is issued for the same user and type", async () => {
    const first = await issueLink(db(), { userId: OWNER, type: "invite" });
    const second = await issueLink(db(), { userId: OWNER, type: "invite" });
    expect(await consumeLink(db(), { token: first.token, type: "invite" })).toBeNull();
    expect(await consumeLink(db(), { token: second.token, type: "invite" })).toBe(OWNER);
  });

  it("a resent invite (now a magic link) retires the first invite, and recovery stands alone", async () => {
    const invite = await issueLink(db(), { userId: OWNER, type: "invite" });
    const recovery = await issueLink(db(), { userId: OWNER, type: "recovery" });
    const magic = await issueLink(db(), { userId: OWNER, type: "magiclink" });
    expect(await consumeLink(db(), { token: invite.token, type: "invite" })).toBeNull();
    expect(await consumeLink(db(), { token: recovery.token, type: "recovery" })).toBe(OWNER);
    expect(await consumeLink(db(), { token: magic.token, type: "magiclink" })).toBe(OWNER);
  });

  it("a revoked session is refused by a fresh read even while its cookie cache is still valid", async () => {
    const { token } = await issueLink(db(), { userId: OWNER, type: "recovery" });
    const ok = await auth.api.verifyLink({ body: { token, type: "recovery" }, headers: new Headers(), returnHeaders: true });
    const cookie = cookieHeader(ok.headers);
    const headers = new Headers({ cookie });
    expect(await auth.api.getSession({ headers })).not.toBeNull();
    await db().prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(OWNER).run();
    expect(await auth.api.getSession({ headers, query: { disableCookieCache: true } })).toBeNull();
  });

  it("verifyLink opens a session once, and not again", async () => {
    const { token } = await issueLink(db(), { userId: OWNER, type: "recovery" });
    const ok = await auth.api.verifyLink({ body: { token, type: "recovery" }, headers: new Headers(), returnHeaders: true });
    expect(ok.response.userId).toBe(OWNER);
    expect(cookieHeader(ok.headers)).toContain("mmg.session_token=");
    expect(sessionCount(OWNER)).toBe(1);
    await expect(auth.api.verifyLink({ body: { token, type: "recovery" }, headers: new Headers() })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(sessionCount(OWNER)).toBe(1);
  });

  it("verifyLink gives no session to a user who has no admin_profiles row", async () => {
    const { token } = await issueLink(db(), { userId: NO_PROFILE, type: "recovery" });
    await expect(auth.api.verifyLink({ body: { token, type: "recovery" }, headers: new Headers() })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    expect(sessionCount(NO_PROFILE)).toBe(0);
  });

  it("has no URL for the server-only endpoints", async () => {
    for (const path of ["mmg/verify-link", "verify-link", "set-own-password", "sign-out-others"]) {
      const res = await auth.handler(new Request(`http://localhost/api/auth/ba/${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: "{}" }));
      expect(res.status).toBe(404);
    }
  });
});

describe("an invited user chooses a password", () => {
  const INVITEE = "44444444-4444-4444-8444-444444444444";

  async function invite() {
    const ctx = await auth.$context;
    // The invite creates the user with no credential account, as createBetterInviteLink does.
    const user = await ctx.internalAdapter.createUser({ id: INVITEE, email: "new.admin@mmg.test", name: "New Admin", emailVerified: true } as never, { method: "admin" });
    raw.prepare("INSERT INTO admin_profiles (user_id, role, full_name, password_set) VALUES (?, 'staff', 'New Admin', 0)").run(user.id);
    const { token } = await issueLink(nodeD1(raw), { userId: user.id, type: "invite" });
    return { user, token };
  }

  it("redeems the invite, sets a password, and can then sign in with it", async () => {
    const { user, token } = await invite();
    const opened = await auth.api.verifyLink({ body: { token, type: "invite" }, headers: new Headers(), returnHeaders: true });
    const cookie = cookieHeader(opened.headers);
    expect(raw.prepare("SELECT COUNT(*) AS n FROM auth_accounts WHERE user_id = ?").get(user.id)).toEqual({ n: 0 });

    const set = await auth.api.setOwnPassword({ body: { password: "a brand new password" }, headers: new Headers({ cookie }), returnHeaders: true });
    expect(raw.prepare("SELECT provider_id, account_id FROM auth_accounts WHERE user_id = ?").all(user.id)).toEqual([{ provider_id: "credential", account_id: user.id }]);
    // The old session is gone, a new one came back in the cookie.
    expect(sessionCount(user.id)).toBe(1);
    expect(await auth.api.getSession({ headers: new Headers({ cookie }), query: { disableCookieCache: true } })).toBeNull();
    const fresh = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader(set.headers) }), query: { disableCookieCache: true } });
    expect(fresh?.user.id).toBe(user.id);

    await expect(signIn("new.admin@mmg.test", "a brand new password")).resolves.toBeTruthy();
    await expect(signIn("new.admin@mmg.test", PASSWORD)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });

  it("changes the password of a user who already has one, and ends the other sessions", async () => {
    const a = await signIn("owner@mmg.test");
    const b = await signIn("owner@mmg.test");
    expect(sessionCount(OWNER)).toBe(2);
    await auth.api.setOwnPassword({ body: { password: "another long password" }, headers: new Headers({ cookie: cookieHeader(a.headers) }) });
    expect(sessionCount(OWNER)).toBe(1);
    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader(b.headers) }), query: { disableCookieCache: true } })).toBeNull();
    await expect(signIn("owner@mmg.test", PASSWORD)).rejects.toMatchObject({ status: "UNAUTHORIZED" });
    await expect(signIn("owner@mmg.test", "another long password")).resolves.toBeTruthy();
  });

  it("refuses a short password and a request with no session", async () => {
    const { headers } = await signIn("owner@mmg.test");
    await expect(auth.api.setOwnPassword({ body: { password: "short" }, headers: new Headers({ cookie: cookieHeader(headers) }) })).rejects.toBeTruthy();
    await expect(auth.api.setOwnPassword({ body: { password: "a long enough password" }, headers: new Headers() })).rejects.toMatchObject({ status: "UNAUTHORIZED" });
  });
});

describe("signOutOthers", () => {
  it("leaves only the current session", async () => {
    const a = await signIn("owner@mmg.test");
    await signIn("owner@mmg.test");
    await signIn("owner@mmg.test");
    expect(sessionCount(OWNER)).toBe(3);
    await auth.api.signOutOthers({ headers: new Headers({ cookie: cookieHeader(a.headers) }) });
    expect(sessionCount(OWNER)).toBe(1);
    const still = await auth.api.getSession({ headers: new Headers({ cookie: cookieHeader(a.headers) }), query: { disableCookieCache: true } });
    expect(still?.user.id).toBe(OWNER);
  });
});
