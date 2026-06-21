import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mutable env mock so each test can toggle the PostHog query credentials.
vi.mock("@/lib/env", () => ({
  env: {
    POSTHOG_PERSONAL_API_KEY: "",
    POSTHOG_PROJECT_ID: "",
    NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
  },
}));

import { env } from "@/lib/env";
import { deriveQueryHost, getWebAnalytics, toRanked } from "./web-analytics";

const mutableEnv = env as unknown as {
  POSTHOG_PERSONAL_API_KEY: string;
  POSTHOG_PROJECT_ID: string;
  NEXT_PUBLIC_POSTHOG_HOST: string;
};

describe("deriveQueryHost", () => {
  it("drops the ingestion subdomain for US", () => {
    expect(deriveQueryHost("https://us.i.posthog.com")).toBe(
      "https://us.posthog.com",
    );
  });

  it("drops the ingestion subdomain for EU", () => {
    expect(deriveQueryHost("https://eu.i.posthog.com")).toBe(
      "https://eu.posthog.com",
    );
  });

  it("falls back to the US app host when empty", () => {
    expect(deriveQueryHost("")).toBe("https://us.posthog.com");
    expect(deriveQueryHost(undefined)).toBe("https://us.posthog.com");
  });
});

describe("toRanked", () => {
  it("maps a [label, count] row", () => {
    expect(toRanked(["/contact", 42])).toEqual({
      label: "/contact",
      count: 42,
    });
  });

  it("falls back to (unknown) for an empty label", () => {
    expect(toRanked(["", 5])).toEqual({ label: "(unknown)", count: 5 });
  });

  it("coerces a non-numeric count to 0", () => {
    expect(toRanked(["/x", "oops"])).toEqual({ label: "/x", count: 0 });
  });
});

describe("getWebAnalytics", () => {
  beforeEach(() => {
    mutableEnv.POSTHOG_PERSONAL_API_KEY = "";
    mutableEnv.POSTHOG_PROJECT_ID = "";
    mutableEnv.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns configured=false when credentials are missing", async () => {
    const result = await getWebAnalytics();
    expect(result.configured).toBe(false);
    expect(result.hasData).toBe(false);
  });

  it("maps PostHog results into the analytics shape", async () => {
    mutableEnv.POSTHOG_PERSONAL_API_KEY = "phx_test";
    mutableEnv.POSTHOG_PROJECT_ID = "467881";

    // Four queries fire in order: KPIs, daily, top pages, top referrers.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ results: [[12, 50, 9, 30]] }))
      .mockResolvedValueOnce(
        jsonRes({
          results: [
            ["2026-06-20", 5],
            ["2026-06-21", 7],
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonRes({
          results: [
            ["/", 20],
            ["/contact", 8],
          ],
        }),
      )
      .mockResolvedValueOnce(jsonRes({ results: [["google.com", 6]] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWebAnalytics();

    expect(result.configured).toBe(true);
    expect(result.hasData).toBe(true);
    expect(result).toMatchObject({
      pageviews7: 12,
      pageviews30: 50,
      visitors7: 9,
      visitors30: 30,
    });
    expect(result.daily).toEqual([
      { date: "2026-06-20", count: 5 },
      { date: "2026-06-21", count: 7 },
    ]);
    expect(result.topPages[0]).toEqual({ label: "/", count: 20 });
    expect(result.topReferrers[0]).toEqual({ label: "google.com", count: 6 });

    // Hits the query API host (ingestion subdomain dropped) + project id.
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://us.posthog.com/api/projects/467881/query/",
    );
  });

  it("reports hasData=false when there are zero pageviews", async () => {
    mutableEnv.POSTHOG_PERSONAL_API_KEY = "phx_test";
    mutableEnv.POSTHOG_PROJECT_ID = "467881";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ results: [[0, 0, 0, 0]] }))
      .mockResolvedValueOnce(jsonRes({ results: [] }))
      .mockResolvedValueOnce(jsonRes({ results: [] }))
      .mockResolvedValueOnce(jsonRes({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getWebAnalytics();
    expect(result.configured).toBe(true);
    expect(result.hasData).toBe(false);
  });

  it("degrades to zeros (never throws) on a query error", async () => {
    mutableEnv.POSTHOG_PERSONAL_API_KEY = "phx_test";
    mutableEnv.POSTHOG_PROJECT_ID = "467881";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonRes({}, { ok: false, status: 403 })),
    );

    const result = await getWebAnalytics();
    expect(result.configured).toBe(true);
    expect(result.hasData).toBe(false);
    expect(result.pageviews30).toBe(0);
  });
});

function jsonRes(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response;
}
