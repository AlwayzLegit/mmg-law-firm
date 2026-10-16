import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sdk);

describe("shared client monitoring loader", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@example.invalid/1");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_ENV", "preview");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock("./sentry-client");
  });

  it("does not load or capture when monitoring has no DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const loader = await import("./load-client-monitoring");
    expect(await loader.loadClientMonitoring()).toBeNull();
    await loader.captureClientException(new Error("mocked test"));
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("starts immediately and shares the same pending promise", async () => {
    const loader = await import("./load-client-monitoring");
    const first = loader.loadClientMonitoring();
    expect(loader.loadClientMonitoring()).toBe(first);
    await first;
    expect(sdk.init).toHaveBeenCalledExactlyOnceWith({
      dsn: "https://public@example.invalid/1",
      environment: "preview",
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
    });
    expect(loader.loadClientMonitoring()).toBe(first);
  });

  it("captures distinct early errors only after initialization, without enrichment", async () => {
    const loader = await import("./load-client-monitoring");
    const first = new Error("first mocked error");
    const second = new Error("second mocked error");
    await Promise.all([
      loader.loadClientMonitoring(),
      loader.captureClientException(first),
      loader.captureClientException(second),
    ]);
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException.mock.calls).toEqual([[first], [second]]);
    expect(sdk.init.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.captureException.mock.invocationCallOrder[0],
    );
  });

  it("does not reinitialize for an error after startup readiness", async () => {
    const client = await import("../../../instrumentation-client");
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1));
    const loader = await import("./load-client-monitoring");
    const error = Object.assign(new Error("mocked"), { digest: "unit-digest" });
    await loader.captureClientException(error);
    client.onRouterTransitionStart("/contact", "push");
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).toHaveBeenCalledExactlyOnceWith(error);
    expect(sdk.captureRouterTransitionStart).toHaveBeenCalledExactlyOnceWith(
      "/contact", "push",
    );
  });

  it("contains init failure and permits only a later explicit retry", async () => {
    const failure = new Error("private fixture must not be logged");
    sdk.init.mockImplementationOnce(() => { throw failure; });
    const loader = await import("./load-client-monitoring");
    await expect(loader.captureClientException(new Error("mocked"))).resolves.toBeUndefined();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "MMG error reporting could not be initialized or completed.",
    );
    const retryError = new Error("later mocked error");
    await loader.captureClientException(retryError);
    expect(sdk.init).toHaveBeenCalledTimes(2);
    expect(sdk.captureException).toHaveBeenCalledExactlyOnceWith(retryError);
  });

  it("contains capture failure without resetting or reinitializing the SDK", async () => {
    sdk.captureException.mockImplementationOnce(() => { throw new Error("mocked transport"); });
    const loader = await import("./load-client-monitoring");
    await expect(loader.captureClientException(new Error("mocked"))).resolves.toBeUndefined();
    await loader.captureClientException(new Error("later mocked"));
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureException).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("contains startup failure without an unhandled promise or timer retry", async () => {
    sdk.init.mockImplementationOnce(() => { throw new Error("mocked init failure"); });
    const client = await import("../../../instrumentation-client");
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledTimes(1));
    client.onRouterTransitionStart("/contact", "push");
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.captureRouterTransitionStart).not.toHaveBeenCalled();
    const loader = await import("./load-client-monitoring");
    await loader.captureClientException(new Error("later mocked boundary"));
    client.onRouterTransitionStart("/contact", "push");
    expect(sdk.init).toHaveBeenCalledTimes(2);
    expect(sdk.captureRouterTransitionStart).toHaveBeenCalledExactlyOnceWith("/contact", "push");
  });

  it("contains a failed dynamic module load and never logs its details", async () => {
    vi.doMock("./sentry-client", () => { throw new Error("private import fixture"); });
    const loader = await import("./load-client-monitoring");
    await expect(loader.captureClientException(new Error("mocked"))).resolves.toBeUndefined();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      "MMG error reporting could not be initialized or completed.",
    );
  });
});
