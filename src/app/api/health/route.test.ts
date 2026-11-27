import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  abortSignal: vi.fn(),
  rpc: vi.fn(),
  rpcAbortSignal: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: mocks.configured,
  getStaticSupabase: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    NEXT_PUBLIC_SITE_URL: "https://www.mmg-lawfirm.com",
  },
}));
import * as routeModule from "./route";
import { DATABASE_TIMEOUT_MS, classifyDatabaseFailure } from "@/lib/health";

const { GET } = routeModule;
// Seven keys since OPS-21: the five of OPS-27 and two server-error counts.
const SEVEN_KEYS = [
  "env",
  "errors24h",
  "errors3h",
  "failing",
  "ok",
  "status",
  "timestamp",
];

// Eight keys while the database check fails (OPS-348): the seven and databaseFailure.
const EIGHT_KEYS = [...SEVEN_KEYS, "databaseFailure"].sort();

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
    mocks.rpc.mockReturnValue({ abortSignal: mocks.rpcAbortSignal });
    mocks.rpcAbortSignal.mockResolvedValue({
      data: [{ errors24h: 4, errors3h: 1 }],
      error: null,
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("answers 200 healthy with only the seven keys, and reads one published row", async () => {
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(SEVEN_KEYS);
    // Healthy: the key is absent, not null (OPS-348).
    expect("databaseFailure" in body).toBe(false);
    expect(body).toMatchObject({
      ok: true,
      status: "healthy",
      env: "test",
      failing: [],
      errors24h: 4,
      errors3h: 1,
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
    expect(Object.keys(body).sort()).toEqual(EIGHT_KEYS);
    expect(body).toMatchObject({
      ok: false,
      status: "unhealthy",
      failing: ["database"],
      databaseFailure: "pgrst",
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
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("aborted");
    expect(body.databaseFailure).toBe("timeout");
  });

  it("answers 503 when no row comes back (a database with nothing published is not serving the site)", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [], error: null });
    const res = await GET();
    expect(res.status).toBe(503);
    expect((await res.json()).databaseFailure).toBe("no row");
  });

  it("answers 503 and never touches the database when it is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
    expect((await res.json()).databaseFailure).toBe("not configured");
  });

  // OPS-348: one case per class, each read in the body, and never any error text.
  const CASES: Array<[string, () => void, string]> = [
    [
      "a timeout the client words as an error",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "TimeoutError: signal timed out", code: "" },
          status: 0,
        }),
      "timeout",
    ],
    [
      "a thrown fetch failure",
      () => mocks.abortSignal.mockRejectedValue(new TypeError("fetch failed")),
      "network",
    ],
    [
      "a failed request with status 0",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "TypeError: fetch failed", code: "" },
          status: 0,
        }),
      "network",
    ],
    [
      "a 401 from the gateway",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "No API key found in request", code: "" },
          status: 401,
        }),
      "http 401",
    ],
    [
      "a 402 (a restricted project)",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "project restricted https://x.supabase.co", code: "" },
          status: 402,
        }),
      "http 402",
    ],
    [
      "a 403",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "forbidden", code: "" },
          status: 403,
        }),
      "http 403",
    ],
    [
      "another 4xx",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "gone", code: "" },
          status: 410,
        }),
      "http 4xx",
    ],
    [
      "a 503",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "upstream", code: "" },
          status: 503,
        }),
      "http 5xx",
    ],
    [
      "a cancelled statement (SQLSTATE 57014)",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "canceling statement", code: "57014" },
          status: 500,
        }),
      "pg 57",
    ],
    [
      "too many connections (SQLSTATE 53300)",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "too many connections", code: "53300" },
          status: 500,
        }),
      "pg 53",
    ],
    [
      "a PostgREST code",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "JWT expired", code: "PGRST301" },
          status: 401,
        }),
      "pgrst",
    ],
    [
      "an error with nothing the list knows",
      () =>
        mocks.abortSignal.mockResolvedValue({
          data: null,
          error: { message: "odd", code: "" },
          status: 200,
        }),
      "other",
    ],
  ];
  it.each(CASES)("reads the class of %s", async (_name, arrange, expected) => {
    arrange();
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.databaseFailure).toBe(expected);
    expect(Object.keys(body).sort()).toEqual(EIGHT_KEYS);
    expect(JSON.stringify(body)).not.toMatch(
      /supabase\.co|No API key|restricted|upstream|canceling|JWT|fetch failed/,
    );
  });

  it("classifies from a fixed list in the monitor's alphabet", () => {
    for (const [, , expected] of CASES) {
      expect(expected).toMatch(/^[A-Za-z0-9 /_?=.,:()'-]{1,30}$/);
    }
    expect(classifyDatabaseFailure({})).toBe("other");
    expect(classifyDatabaseFailure({ error: { code: "ab" }, status: "500" })).toBe("other");
  });

  it("reads the counts for this environment through error_counts_recent, with the anon client", async () => {
    await GET();
    expect(mocks.rpc).toHaveBeenCalledWith("error_counts_recent", {
      p_env: "production",
    });
    const signal = mocks.rpcAbortSignal.mock.calls[0]![0] as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("shows zero as a number, not as null", async () => {
    mocks.rpcAbortSignal.mockResolvedValue({
      data: [{ errors24h: 0, errors3h: 0 }],
      error: null,
    });
    const body = await (await GET()).json();
    expect(body.errors24h).toBe(0);
    expect(body.errors3h).toBe(0);
  });

  it("gives null for both counts, and stays 200 healthy, when the function does not exist yet", async () => {
    mocks.rpcAbortSignal.mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        message: "Could not find the function public.error_counts_recent",
      },
    });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "healthy",
      failing: [],
      errors24h: null,
      errors3h: null,
    });
    expect(Object.keys(body).sort()).toEqual(SEVEN_KEYS);
    expect(JSON.stringify(body)).not.toContain("Could not find");
    // Only the code reaches the log.
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      "Could not find",
    );
  });

  it("gives null when the read throws or times out, and when the answer is not two whole numbers", async () => {
    mocks.rpcAbortSignal.mockRejectedValue(new Error("timeout"));
    expect((await (await GET()).json()).errors3h).toBeNull();
    for (const data of [
      [],
      null,
      [{ errors24h: "4", errors3h: 1 }],
      [{ errors24h: 4 }],
      [{ errors24h: -1, errors3h: 0 }],
      [{ errors24h: 1.5, errors3h: 0 }],
    ]) {
      mocks.rpcAbortSignal.mockResolvedValue({ data, error: null });
      const body = await (await GET()).json();
      expect(body.errors24h, JSON.stringify(data)).toBeNull();
      expect(body.errors3h, JSON.stringify(data)).toBeNull();
    }
  });

  it("a huge count does not make the answer unhealthy", async () => {
    mocks.rpcAbortSignal.mockResolvedValue({
      data: [{ errors24h: 2_000_000, errors3h: 900_000 }],
      error: null,
    });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, status: "healthy", failing: [] });
    expect(body.errors3h).toBe(900_000);
  });

  it("a failing database stays 503 whatever the counts say", async () => {
    mocks.abortSignal.mockResolvedValue({ data: [], error: null });
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.failing).toEqual(["database"]);
    expect(body.databaseFailure).toBe("no row");
    expect(body.errors3h).toBe(1);
  });

  it("never reads the counts when the database is not configured", async () => {
    mocks.configured.mockReturnValue(false);
    const body = await (await GET()).json();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(body.errors24h).toBeNull();
    expect(body.errors3h).toBeNull();
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
