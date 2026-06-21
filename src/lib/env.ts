import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().or(z.literal("")).default(""),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  RESEND_FROM_EMAIL: z.string().email().or(z.literal("")).default(""),
  LEAD_NOTIFY_EMAIL: z.string().email().or(z.literal("")).default(""),

  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),
  TWILIO_FROM_NUMBER: z.string().default(""),

  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().default(""),
  TURNSTILE_SECRET_KEY: z.string().default(""),

  NEXT_PUBLIC_GA_ID: z.string().default(""),

  // Sentry — error tracking. Public DSN is fine to expose; the auth token
  // is used at build time only by the Next.js plugin to upload source maps.
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().or(z.literal("")).default(""),
  SENTRY_AUTH_TOKEN: z.string().default(""),
  SENTRY_ORG: z.string().default(""),
  SENTRY_PROJECT: z.string().default(""),

  // PostHog — product analytics. Public project API key plus host (use
  // https://us.i.posthog.com unless the project lives on the EU cloud).
  NEXT_PUBLIC_POSTHOG_KEY: z.string().default(""),
  NEXT_PUBLIC_POSTHOG_HOST: z
    .string()
    .url()
    .or(z.literal(""))
    .default("https://us.i.posthog.com"),

  REVALIDATE_SECRET: z.string().default(""),

  // Admin API bearer token for programmatic access (e.g. posting blogs from
  // an external tool). Secret. When unset, /api/admin/* returns 503.
  ADMIN_API_KEY: z.string().default(""),

  // Shared secret for cron-triggered routes (weekly digest). Vercel Cron
  // sends it as "Authorization: Bearer <CRON_SECRET>". When unset, the cron
  // endpoints return 401 so they can't be hit anonymously.
  CRON_SECRET: z.string().default(""),

  // Safety valve for the strict Content-Security-Policy emitted by proxy.ts.
  // Set to "1" to send it as Content-Security-Policy-Report-Only (browsers
  // report violations but never block) — an instant, code-free rollback if a
  // legitimate script ever gets blocked in production.
  CSP_REPORT_ONLY: z.string().default(""),
});

const REQUIRED_IN_PROD: ReadonlyArray<keyof z.infer<typeof ServerEnvSchema>> = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "LEAD_NOTIFY_EMAIL",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY",
  "REVALIDATE_SECRET",
];

function loadEnv() {
  const parsed = ServerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const msg = `Invalid environment configuration: ${JSON.stringify(flat, null, 2)}`;
    if (isProd) throw new Error(msg);
    console.warn(`[env] ${msg}`);
    return ServerEnvSchema.parse({});
  }

  const missing = REQUIRED_IN_PROD.filter((k) => !parsed.data[k]);
  if (missing.length > 0) {
    const note = `[env] Missing env vars: ${missing.join(", ")}`;
    // Production behavior is intentionally non-fatal: the data layer falls
    // back to in-code seeds when Supabase isn't configured, and the lead
    // form / admin / Resend / Turnstile call sites all degrade gracefully.
    // This means an env-var oversight surfaces as missing functionality
    // rather than a hard 500 — which matters most during initial deploy
    // when env vars are still being filled in. Each call site that needs
    // a specific var still throws at the point of use with a clear error.
    console.warn(
      `${note} (using fallbacks; set in Vercel for full functionality)`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof ServerEnvSchema>;
