import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Sampling: in production, sample 20% of transactions for performance
    // tracing — high enough to catch slow lead inserts, low enough to stay
    // under free-tier event budgets. Errors are always 1.0.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    // Don't ship PII (we run a public lead form — IP and headers can leak).
    sendDefaultPii: false,
  });
}
