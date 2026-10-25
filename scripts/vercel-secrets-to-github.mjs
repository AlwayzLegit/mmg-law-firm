#!/usr/bin/env node
/**
 * Copy this deployment's environment variables into a GitHub Actions
 * environment, from INSIDE a Vercel production build.
 *
 * Why it runs inside the build: Vercel marks almost every variable on this
 * project "sensitive", and sensitive values can never be read back — not in
 * the dashboard, not through the API, not with `vercel env pull`. The only
 * place they exist in plain form is the build/runtime environment. So the
 * build itself hands them to GitHub, where the Cloudflare deploy workflow
 * (.github/workflows/cloudflare-deploy.yml) picks them up for the Worker.
 * No value passes through a person, a file, a chat or a log.
 *
 * Inert unless BOTH are true:
 *   - VERCEL_ENV === "production"
 *   - SYNC_SECRETS_GITHUB_TOKEN is set (a fine-grained GitHub token for this
 *     repo only, with "Secrets: read and write" and "Environments: read and
 *     write"; the target environment already exists, so nothing broader)
 * Optional: SYNC_SECRETS_GITHUB_ENV, comma-separated (default
 * "cloudflare-production,cloudflare-staging").
 *
 * Never fails the build: any error is logged (key names only) and the
 * script exits 0 so the production deploy goes ahead regardless.
 *
 * One-time use: set the token on Vercel, redeploy production once, then
 * delete the token from Vercel and revoke it on GitHub.
 * Run by `pnpm build` (package.json) before `next build`.
 */
import { pathToFileURL } from "node:url";

/**
 * Both Workers get the same values: staging shares the production database
 * and email account, and its build drops the analytics keys itself
 * (cloudflare-deploy.yml), so staging traffic never reaches GA / PostHog.
 */
export const DEFAULT_ENVIRONMENTS = "cloudflare-production,cloudflare-staging";

/** Keys the Cloudflare deploy workflow consumes (build step + Worker secrets). */
export const SYNC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_WEBHOOK_SECRET",
  "LEAD_NOTIFY_EMAIL",
  "CONTENT_NOTIFY_EMAIL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "CRON_SECRET",
  "REVALIDATE_SECRET",
  "ADMIN_API_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
  "NEXT_PUBLIC_GA_ID",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "POSTHOG_PERSONAL_API_KEY",
  "POSTHOG_PROJECT_ID",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
];

/**
 * Decide what to sync. Pure, so it is unit-tested. Returns null when the
 * script should do nothing (not production, or no token).
 * NEXT_PUBLIC_SITE_URL is deliberately excluded: the deploy workflow sets
 * it per target (production vs staging).
 */
export function planSync(env) {
  if (env.VERCEL_ENV !== "production") return null;
  const token = (env.SYNC_SECRETS_GITHUB_TOKEN ?? "").trim();
  if (!token) return null;
  const repo =
    env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG
      ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}`
      : "";
  if (!repo) return { error: "repo-unknown" };
  const environments = ((env.SYNC_SECRETS_GITHUB_ENV ?? "").trim() || DEFAULT_ENVIRONMENTS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (environments.length === 0 || environments.some((e) => !/^[A-Za-z0-9._-]+$/.test(e)))
    return { error: "bad-environment-name" };
  const present = [];
  const missing = [];
  for (const key of SYNC_KEYS) {
    const v = env[key];
    if (typeof v === "string" && v.length > 0) present.push(key);
    else missing.push(key);
  }
  return { token, repo, environments, present, missing };
}

async function gh(token, method, path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "mmg-law-secrets-sync",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path.replace(/secrets\/[^/]+$/, "secrets/…")} → HTTP ${res.status}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function main() {
  const plan = planSync(process.env);
  if (plan === null) return; // inert: the normal case on every build
  if (plan.error) {
    console.warn(`[secrets-sync] skipped: ${plan.error}`);
    return;
  }
  const { token, repo, environments, present, missing } = plan;
  const { default: sodium } = await import("libsodium-wrappers");
  await sodium.ready;

  for (const environment of environments) {
    const envPath = `/repos/${repo}/environments/${encodeURIComponent(environment)}`;
    console.log(`[secrets-sync] ${present.length} key(s) → ${repo} environment "${environment}"`);
    try {
      // Make sure the environment exists (idempotent). Needs "Administration:
      // write"; when it already exists that is unnecessary, so not fatal.
      await gh(token, "PUT", envPath, {}).catch(() => {});
      const key = await gh(token, "GET", `${envPath}/secrets/public-key`);
      const publicKey = sodium.from_base64(key.key, sodium.base64_variants.ORIGINAL);
      const done = [];
      const failed = [];
      for (const name of present) {
        try {
          const sealed = sodium.crypto_box_seal(sodium.from_string(process.env[name]), publicKey);
          await gh(token, "PUT", `${envPath}/secrets/${name}`, {
            encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL),
            key_id: key.key_id,
          });
          done.push(name);
        } catch (err) {
          failed.push(`${name} (${err instanceof Error ? err.message : "error"})`);
        }
      }
      console.log(`[secrets-sync] "${environment}": set ${done.length}/${present.length}: ${done.join(", ")}`);
      if (failed.length) console.warn(`[secrets-sync] "${environment}" failed: ${failed.join("; ")}`);
    } catch (err) {
      console.warn(`[secrets-sync] "${environment}" skipped: ${err instanceof Error ? err.message : "error"}`);
    }
  }
  if (missing.length) console.log(`[secrets-sync] not set on Vercel (skipped): ${missing.join(", ")}`);
  console.log("[secrets-sync] done — now delete SYNC_SECRETS_GITHUB_TOKEN on Vercel and revoke the token on GitHub.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    // Never block a production deploy on this.
    console.warn(`[secrets-sync] skipped after error: ${err instanceof Error ? err.message : "unknown"}`);
  });
}
