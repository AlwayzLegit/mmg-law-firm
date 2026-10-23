#!/usr/bin/env node
/**
 * Create (or repair) the first admin owner and print a one-time sign-in link.
 *
 *   pnpm bootstrap-owner --email owner@mmg-lawfirm.com --name "Mihran Ghazaryan"
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * NEXT_PUBLIC_SITE_URL from the environment, falling back to .env.local.
 * Point them at the project you want to bootstrap (prod or local).
 *
 * What it does, idempotently:
 *   1. Creates the auth user if it doesn't exist (email pre-confirmed).
 *   2. Upserts admin_profiles with role 'owner' and password_set = false.
 *   3. Mints a token_hash sign-in link and prints it. Open it in a browser:
 *      it signs you in and lands on /onboarding to choose a password. After
 *      that, sign in at /login with email + password, and invite everyone
 *      else from /admin/settings.
 *
 * The link works once and expires in one hour. Re-run the script for a new
 * one, or use "Email me a sign-in link" on /login once Resend is configured.
 *
 * No email is sent here on purpose: the first owner is usually created
 * before the Resend domain is verified.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

loadDotEnv(resolve(process.cwd(), ".env.local"));

const email = arg("email")?.trim().toLowerCase();
const name = arg("name")?.trim() || "Site Owner";
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  fail('Usage: pnpm bootstrap-owner --email you@example.com --name "Your Name"');
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
if (!url || !serviceKey) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (env or .env.local).",
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\nSupabase project: ${url}`);
console.log(`Site URL:         ${siteUrl}`);
console.log(`Owner:            ${name} <${email}>\n`);

// 1. Auth user (create or find).
let userId;
{
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (!error && data?.user) {
    userId = data.user.id;
    console.log("✓ Created auth user");
  } else {
    // Already exists (or another error) — look the user up by email.
    let page = 1;
    while (!userId) {
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listErr) fail(`Couldn't list users: ${listErr.message}`);
      const hit = list.users.find((u) => u.email?.toLowerCase() === email);
      if (hit) userId = hit.id;
      else if (list.users.length < 200) break;
      else page += 1;
    }
    if (!userId) fail(`Couldn't create user: ${error?.message ?? "unknown error"}`);
    console.log("✓ Auth user already exists");
  }
}

// 2. Owner profile.
{
  const { error } = await supabase.from("admin_profiles").upsert(
    { user_id: userId, role: "owner", full_name: name, password_set: false },
    { onConflict: "user_id" },
  );
  if (error) {
    if (/password_set/.test(error.message)) {
      fail(
        "admin_profiles.password_set is missing — apply supabase/migrations/0035_admin_password_set.sql first.",
      );
    }
    fail(`Couldn't write admin_profiles: ${error.message}`);
  }
  console.log("✓ admin_profiles row set to owner (password not set yet)");
}

// 3. One-time sign-in link.
{
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const token = data?.properties?.hashed_token;
  if (error || !token) {
    fail(`Couldn't generate a sign-in link: ${error?.message ?? "no token"}`);
  }
  const link = `${siteUrl}/auth/callback?token_hash=${encodeURIComponent(
    token,
  )}&type=magiclink&next=${encodeURIComponent("/onboarding")}`;
  console.log("\nOpen this link in a browser to sign in and choose a password.");
  console.log("It works once and expires in one hour.\n");
  console.log(`  ${link}\n`);
  console.log(
    "Afterwards: sign in at /login with email + password, then invite the rest of the team from /admin/settings.\n",
  );
}
