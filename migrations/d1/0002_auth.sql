-- OPS-365 (part 3 of OPS-353): tables for Better Auth, the admin sign-in on D1.
--
-- Tables and indexes only (CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS),
-- so this is an additive migration: it changes no existing table or row, and
-- admin_profiles is NOT altered. Column names follow The Look's
-- migrations/d1/0004_auth.sql; the model-to-table mapping is in src/lib/auth/better.ts.
--
-- NOTHING READS THESE TABLES until AUTH_PROVIDER=better-auth is set on a Worker
-- (OPS-366 does that on staging). Production keeps Supabase Auth.
--
-- auth_users.id is the Supabase auth user id, kept as is, so admin_profiles.user_id
-- and every assigned_to, author_id and created_by column stay valid after the
-- users are copied (OPS-366). Password hashes are bcrypt ($2a$ / $2b$ / $2y$) and
-- live in auth_accounts.password; a user with no hash gets a fresh invite.
-- Invite and password-reset tokens are rows of auth_verifications, stored as a
-- SHA-256 of the token, single use.

CREATE TABLE IF NOT EXISTS auth_users (
  id              TEXT PRIMARY KEY NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  email_verified  INTEGER NOT NULL DEFAULT 1 CHECK (email_verified IN (0, 1)),
  image_url       TEXT,
  banned_until    TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id           TEXT PRIMARY KEY NOT NULL,
  user_id      TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  expires_at   TEXT NOT NULL,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_accounts (
  id                        TEXT PRIMARY KEY NOT NULL,
  user_id                   TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  account_id                TEXT NOT NULL,
  provider_id               TEXT NOT NULL,          -- 'credential' for email + password
  password                  TEXT,                   -- bcrypt hash
  access_token              TEXT,
  refresh_token             TEXT,
  id_token                  TEXT,
  access_token_expires_at   TEXT,
  refresh_token_expires_at  TEXT,
  scope                     TEXT,
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider_id, account_id)
);
CREATE INDEX IF NOT EXISTS auth_accounts_user ON auth_accounts (user_id);

CREATE TABLE IF NOT EXISTS auth_verifications (
  id          TEXT PRIMARY KEY NOT NULL,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier ON auth_verifications (identifier);
