import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";

import type { D1Like } from "@/lib/db/d1Client";
import { LINK_TYPES, consumeLink } from "@/lib/auth/links";

/**
 * Better Auth on Cloudflare D1 (OPS-365, part 3 of OPS-353). Only used when
 * AUTH_PROVIDER=better-auth (src/lib/auth/provider.ts); the Supabase path is
 * untouched. Same shape as The Look's authBetter.ts: bcrypt hashes, no
 * self sign-up, our own rate limits, sessions refused for anyone without an
 * admin_profiles row.
 *
 * Tables: migrations/d1/0002_auth.sql (auth_users, auth_sessions,
 * auth_accounts, auth_verifications). The user id is the Supabase auth user id,
 * so admin_profiles.user_id and every assigned_to / author_id stay valid.
 */

export const BETTER_AUTH_BASE_PATH = "/api/auth/ba";
export const SESSION_SECONDS = 8 * 60 * 60;
export const SESSION_REFRESH_SECONDS = 60 * 60;
/** How long a signed session cookie may be trusted without a database read. */
export const COOKIE_CACHE_SECONDS = 5 * 60;
export const BCRYPT_COST = 12;

export interface BetterAuthDeps {
  /** What Better Auth talks to: the D1 binding, or a node:sqlite DatabaseSync in tests. */
  database: unknown;
  /** The same database through the D1 statement API, for the few raw statements here. */
  db: D1Like;
  secret: string | undefined;
  baseURL?: string;
  secure: boolean;
  /** True when the request may go ahead. Fixed window set by the caller. */
  allow(key: string, limit: number): Promise<boolean>;
}

export function assertSecret(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_PROVIDER=better-auth needs BETTER_AUTH_SECRET, at least 32 characters.");
  }
  return secret;
}

export function clientIp(headers: Headers | null | undefined): string {
  const cf = headers?.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = headers?.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}

/** A user may open a session only if they have an admin_profiles row and are not banned. */
export async function mayHaveSession(db: D1Like, userId: string, now = new Date()): Promise<boolean> {
  const { results } = await db
    .prepare("SELECT (SELECT banned_until FROM auth_users WHERE id = ?) AS banned_until, (SELECT COUNT(*) FROM admin_profiles WHERE user_id = ?) AS profiles")
    .bind(userId, userId)
    .all<{ banned_until: string | null; profiles: number }>();
  const row = results[0];
  if (!row || Number(row.profiles) < 1) return false;
  if (row.banned_until && new Date(row.banned_until).getTime() > now.getTime()) return false;
  return true;
}

function mmgPlugin(deps: BetterAuthDeps) {
  return {
    id: "mmg-admin",
    endpoints: {
      /**
       * Redeem an invite, magic or recovery link: the token is read once, a
       * session is created for its user and the session cookie is set. Server
       * only: it has no URL, /auth/callback calls it through auth.api.
       */
      verifyLink: createAuthEndpoint.serverOnly(
        { method: "POST", body: z.object({ token: z.string().min(20).max(200), type: z.enum(LINK_TYPES) }) },
        async (ctx) => {
          const userId = await consumeLink(deps.db, { token: ctx.body.token, type: ctx.body.type });
          if (!userId) throw new APIError("UNAUTHORIZED", { message: "This link has expired or was already used." });
          const user = await ctx.context.internalAdapter.findUserById(userId);
          if (!user) throw new APIError("UNAUTHORIZED", { message: "This link has expired or was already used." });
          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) throw new APIError("UNAUTHORIZED", { message: "This account isn't authorized for the admin." });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ userId: user.id });
        },
      ),

      /**
       * Set the signed-in user's password (first password after an invite, a
       * reset, or a change). Creates the credential account for an invited
       * user who has none. Ends every session and gives this browser a new one,
       * so the old session id stops working (OWASP session management).
       */
      setOwnPassword: createAuthEndpoint.serverOnly(
        { method: "POST", body: z.object({ password: z.string().min(10).max(72) }), requireHeaders: true },
        async (ctx) => {
          const current = await getSessionFromCtx(ctx, { disableCookieCache: true });
          if (!current) throw new APIError("UNAUTHORIZED", { message: "Not signed in." });
          const { user } = current;
          const hash = await ctx.context.password.hash(ctx.body.password);
          const account = await ctx.context.internalAdapter.findCredentialAccount(user.id);
          if (account) {
            await ctx.context.internalAdapter.updatePassword(user.id, hash);
          } else {
            await ctx.context.internalAdapter.linkAccount({
              userId: user.id,
              providerId: "credential",
              accountId: user.id,
              password: hash,
            });
          }
          await ctx.context.internalAdapter.deleteUserSessions(user.id);
          const session = await ctx.context.internalAdapter.createSession(user.id);
          if (!session) throw new APIError("UNAUTHORIZED", { message: "This account isn't authorized for the admin." });
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ ok: true });
        },
      ),

      /** End every session of the signed-in user except this one. */
      signOutOthers: createAuthEndpoint.serverOnly({ method: "POST", requireHeaders: true }, async (ctx) => {
        const current = await getSessionFromCtx(ctx, { disableCookieCache: true });
        if (!current) throw new APIError("UNAUTHORIZED", { message: "Not signed in." });
        await deps.db
          .prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token <> ?")
          .bind(current.user.id, current.session.token)
          .run();
        return ctx.json({ ok: true });
      }),
    },
  } satisfies BetterAuthPlugin;
}

export function buildBetterAuth(deps: BetterAuthDeps) {
  const secret = assertSecret(deps.secret);
  return betterAuth({
    secret,
    baseURL: deps.baseURL,
    basePath: BETTER_AUTH_BASE_PATH,
    database: deps.database as never,
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 72,
      password: {
        hash: async (password) => (await import("bcryptjs")).hash(password, BCRYPT_COST),
        verify: async ({ hash, password }) => (await import("bcryptjs")).compare(password, hash),
      },
    },
    user: {
      modelName: "auth_users",
      fields: {
        emailVerified: "email_verified",
        image: "image_url",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      additionalFields: {
        bannedUntil: { type: "string", fieldName: "banned_until", required: false, input: false },
      },
    },
    session: {
      modelName: "auth_sessions",
      expiresIn: SESSION_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_SECONDS },
      fields: {
        userId: "user_id",
        expiresAt: "expires_at",
        ipAddress: "ip_address",
        userAgent: "user_agent",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    account: {
      modelName: "auth_accounts",
      fields: {
        userId: "user_id",
        accountId: "account_id",
        providerId: "provider_id",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        idToken: "id_token",
        accessTokenExpiresAt: "access_token_expires_at",
        refreshTokenExpiresAt: "refresh_token_expires_at",
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    },
    verification: {
      modelName: "auth_verifications",
      fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" },
    },
    advanced: {
      cookiePrefix: "mmg",
      useSecureCookies: deps.secure,
      database: { generateId: "uuid" },
    },
    // The site's own limiter is used below; Better Auth's is per isolate on Workers.
    rateLimit: { enabled: false },
    databaseHooks: {
      session: {
        create: {
          // No session for a user without an admin_profiles row or while banned.
          before: async (session) => {
            if (!(await mayHaveSession(deps.db, session.userId))) return false;
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").toLowerCase().trim();
        const ip = clientIp(ctx.headers);
        const [byEmail, byIp] = await Promise.all([deps.allow(`login:${email}`, 10), deps.allow(`login-ip:${ip}`, 30)]);
        if (!byEmail || !byIp) {
          throw new APIError("TOO_MANY_REQUESTS", { message: "Too many sign-in attempts. Try again later." });
        }
      }),
    },
    plugins: [mmgPlugin(deps), nextCookies()],
  });
}

export type BetterAuthInstance = ReturnType<typeof buildBetterAuth>;

async function workerEnv(): Promise<{ DB?: D1Like }> {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as { DB?: D1Like };
}

let cached: { db: D1Like; auth: BetterAuthInstance } | null = null;

/** One instance per D1 binding (a binding is stable within an isolate). */
export async function getBetterAuth(): Promise<{ auth: BetterAuthInstance; db: D1Like }> {
  if (process.env.DATA_PROVIDER !== "d1") {
    throw new Error("AUTH_PROVIDER=better-auth needs DATA_PROVIDER=d1: the admin gate reads admin_profiles from D1.");
  }
  const db = (await workerEnv()).DB;
  if (!db) throw new Error("AUTH_PROVIDER=better-auth needs the D1 binding DB (see wrangler.jsonc).");
  if (!cached || cached.db !== db) {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    cached = {
      db,
      auth: buildBetterAuth({
        database: db,
        db,
        secret: process.env.BETTER_AUTH_SECRET,
        baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL,
        secure: process.env.NODE_ENV === "production",
        allow: async (key, limit) => (await checkRateLimit(key, limit)).allowed,
      }),
    };
  }
  return { auth: cached.auth, db };
}
