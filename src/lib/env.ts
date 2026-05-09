import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";
// Skip the strict prod-required check during `next build` so that builds in
// environments without secrets (CI, local prod-build smoke checks) succeed.
// At true runtime, NEXT_PHASE is unset and the strict check applies.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

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

  REVALIDATE_SECRET: z.string().default(""),
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
    if (isProd && !isBuildPhase) {
      throw new Error(`${note} (required at runtime in production)`);
    }
    console.warn(`${note} (ok in dev / build; required at prod runtime)`);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof ServerEnvSchema>;
