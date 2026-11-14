import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  abortSignal: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: mocks.configured,
  getStaticSupabase: () => ({ from: mocks.from }),
}));
vi.mock("@/lib/env", () => ({ env: { NODE_ENV: "test" } }));
import * as routeModule from "./route";
import { DATABASE_TIMEOUT_MS } from "@/lib/health";

const { GET } = routeModule;
const FIVE_KEYS = ["env", "failing", "ok", "status", "timestamp"];

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.configured.mockReturnValue(true);
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.eq.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockReturnValue({ abortSignal: mocks.abortSignal });
    mocks.abortSignal.mockResolvedValue({
      data: [{ id: "private-row-id" }],
      error: null,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("answers 200 healthy with only the five keys, and reads one published row", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(FIVE_KEYS);
    expect(body).toMatchObject({
      ok: true,
      status: "healthy",
      env: "test",
      failing: [],
    });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(JSON.stringify(body)).not.toContain("private-row-id");
    expect(mocks.from).toHaveBeenCalledWith("practice_areas");
    expect(mocks.select).toHaveBeenCalledWith("id");
    expect(mocks.eq).toHaveBeenCalledWith("is_published", true);
    expect(mocks.limit).toHaveBeenCalledWith(1);
  });

  it("is never cached and never indexed", async () => {
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("gives the database five seconds, no more", async () => {
    await GET();
    const signal = mocks.abortSignal.mock.calls[0]![0] as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(DATABASE_TIMEOUT_MS).toBe(5000);
  });

  it("answers 503 with no detail when the database returns an error", async () => {
    mocks.abortSignal.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST301",
        message: "JWT secret leaked-text https://project.supabase.co",
      },
    });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(Object.keys(body).sort()).toEqual(FIVE_KEYS);
    expect(body).toMatchObject({
      ok: false,
      status: "unhealthy",
      failing: ["database"],
    });
    expect(JSON.stringify(body)).not.toMatch(
      /leaked-text|supabase\.co|PGRST301/,
    );
    // Only the error code reaches the server log, never the message.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "leaked-text",
    );
  });

  it("answers 503 when the query throws or times out", async () => {
    mocks.abortSignal.mockRejectedValue(
      new Error("The operation was aborted due to timeout"),
    );
    const res = await GET();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("aborted");
  });

  it("answers 503 when no row comes back (a database with nothing published is not serving the site)", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [], error: null });
    expect((await GET()).status).toBe(503);
  });

  it("answers 503 and never touches the database when it is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("exports GET only, so every other method answers 405", () => {
    expect(
      Object.keys(routeModule).filter((k) =>
        ["POST", "PUT", "PATCH", "DELETE"].includes(k),
      ),
    ).toEqual([]);
    expect(routeModule.dynamic).toBe("force-dynamic");
    expect(routeModule.runtime).toBe("nodejs");
  });
});
