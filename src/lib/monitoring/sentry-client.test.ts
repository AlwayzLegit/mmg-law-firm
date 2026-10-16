import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sdk);

describe("lazy browser monitoring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not initialize monitoring when no public DSN is configured", async () => {
    const client = await import("../../../instrumentation-client");
    client.onRouterTransitionStart("/contact", "push");
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureRouterTransitionStart).not.toHaveBeenCalled();
  });

  it("keeps error collection, tracing and privacy options unchanged", async () => {
    const { initializeClientMonitoring } = await import("./sentry-client");
    const capture = initializeClientMonitoring(
      "https://public@example.invalid/1",
      "preview",
    );
    expect(sdk.init).toHaveBeenCalledExactlyOnceWith({
      dsn: "https://public@example.invalid/1",
      environment: "preview",
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
    });
    expect(capture).toBe(sdk.captureRouterTransitionStart);
  });

  it("initializes once and forwards router transitions after loading", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "production");
    const client = await import("../../../instrumentation-client");
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1));
    client.onRouterTransitionStart("/contact", "push");
    expect(sdk.captureRouterTransitionStart).toHaveBeenCalledExactlyOnceWith(
      "/contact",
      "push",
    );
    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "production" }),
    );
  });

  it("retains NODE_ENV as the environment fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
    vi.stubEnv("NODE_ENV", "test");
    await import("../../../instrumentation-client");
    await vi.waitFor(() =>
      expect(sdk.init).toHaveBeenCalledWith(
        expect.objectContaining({ environment: "test" }),
      ),
    );
  });
});
