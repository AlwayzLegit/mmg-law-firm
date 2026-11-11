import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // NEXT_PUBLIC_SENTRY_ENVIRONMENT is set by the Cloudflare deploy
    // ("production" or "staging") so staging errors are not filed as
    // production; Vercel builds fall back to VERCEL_ENV.
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.VERCEL_ENV ||
      process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    sendDefaultPii: false,
  });
}
