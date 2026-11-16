import { describe, expect, it, vi } from "vitest";

import {
  COUNT_TIMEOUT_MS,
  MAX_COUNTS_PER_MINUTE,
  envName,
  makeCounter,
  routeGroup,
  shouldCount,
  withErrorCount,
} from "./error-count";

const URL_ = "https://project-ref.supabase.co";
const KEY = "service-role-key-for-tests-only";

describe("routeGroup", () => {
  it("cuts an API path to two segments and drops the query string", () => {
    expect(routeGroup("/api/leads")).toBe("/api/leads");
    expect(routeGroup("/api/leads?x=1")).toBe("/api/leads");
    expect(routeGroup("/api/health")).toBe("/api/health");
    expect(routeGroup("/api/leads/some/deeper/path")).toBe("/api/leads");
  });

  it("never keeps an id from an admin path", () => {
    expect(
      routeGroup("/api/admin/leads/0b9f4d3e-1c2a-4b5d-8e6f-7a8b9c0d1e2f"),
    ).toBe("/api/admin");
    expect(
      routeGroup("/admin/leads/0b9f4d3e-1c2a-4b5d-8e6f-7a8b9c0d1e2f"),
    ).toBe("/admin");
    expect(routeGroup("/admin")).toBe("/admin");
  });

  it("puts every other path, including a city page, in /page", () => {
    expect(routeGroup("/")).toBe("/page");
    expect(routeGroup("/practice-areas/car-accidents")).toBe("/page");
    expect(routeGroup("/locations/los-angeles-county/glendale")).toBe("/page");
    expect(routeGroup("/_next/static/chunks/abc.js")).toBe("/page");
  });

  it("never lets an address or an id through", () => {
    expect(routeGroup("/page/jane.doe@example.com")).toBe("/page");
    expect(routeGroup("/api/jane.doe@example.com")).toBe("/api/other");
    expect(routeGroup("/api/123456")).toBe("/api/other");
    expect(routeGroup("/api/Some_Thing")).toBe("/api/other");
    expect(routeGroup("/api/" + "a".repeat(80))).toBe("/api/other");
    expect(routeGroup("/api")).toBe("/api/other");
    expect(routeGroup("/api/")).toBe("/api/other");
  });

  it("always answers with a group the database function accepts", () => {
    const accepted = /^\/[a-z0-9-]+(\/[a-z0-9-]+)?$/;
    for (const p of [
      "/",
      "/api",
      "/api/x",
      "/admin/a/b",
      "/a@b.c",
      "//",
      "",
      "/api/%00",
      "/api/ü",
    ]) {
      const g = routeGroup(p);
      expect(g, p).toMatch(accepted);
      expect(g.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("shouldCount", () => {
  it("counts 500 to 599 and nothing else", () => {
    for (const s of [500, 502, 503, 599])
      expect(shouldCount(s), String(s)).toBe(true);
    for (const s of [200, 301, 404, 429, 499, 600, 0, NaN, 500.5])
      expect(shouldCount(s), String(s)).toBe(false);
  });
});

describe("envName", () => {
  it("is staging only for a staging. host", () => {
    expect(envName("https://staging.mmg-lawfirm.com")).toBe("staging");
    expect(envName("https://www.mmg-lawfirm.com")).toBe("production");
    expect(envName("https://mmg-lawfirm.com/staging.")).toBe("production");
    expect(envName(undefined)).toBe("production");
    expect(envName("not a url")).toBe("production");
  });
});

describe("makeCounter", () => {
  it("posts the exact address, headers and body, with a two second limit", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("", { status: 200 }),
    );
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const counter = makeCounter({
      url: `${URL_}/`,
      key: KEY,
      env: "production",
      fetchImpl,
    });
    await counter.count("/api/leads?email=a@b.c");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [address, init] = fetchImpl.mock.calls[0]!;
    expect(String(address)).toBe(`${URL_}/rest/v1/rpc/bump_error_count`);
    expect(init!.method).toBe("POST");
    expect(JSON.parse(String(init!.body))).toEqual({
      p_env: "production",
      p_route: "/api/leads",
    });
    expect(init!.headers).toMatchObject({
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
    });
    expect(timeoutSpy).toHaveBeenCalledWith(COUNT_TIMEOUT_MS);
    expect(COUNT_TIMEOUT_MS).toBe(2000);
    // Nothing of the visitor's request travels: not the query string, not an address.
    expect(String(init!.body)).not.toMatch(/email|a@b\.c|\?/);
    timeoutSpy.mockRestore();
  });

  it("counts for staging when the environment is staging", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("", { status: 200 }),
    );
    await makeCounter({ url: URL_, key: KEY, env: "staging", fetchImpl }).count(
      "/page",
    );
    const init = fetchImpl.mock.calls[0]![1] as RequestInit;
    expect(JSON.parse(String(init!.body))).toEqual({
      p_env: "staging",
      p_route: "/page",
    });
  });

  it("does nothing without an address or a key", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("", { status: 200 }),
    );
    await makeCounter({ key: KEY, env: "production", fetchImpl }).count(
      "/page",
    );
    await makeCounter({ url: URL_, env: "production", fetchImpl }).count(
      "/page",
    );
    await makeCounter({ url: "", key: "", env: "production", fetchImpl }).count(
      "/page",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("swallows a rejected request and a timeout", async () => {
    const rejected = vi.fn(async () => {
      throw new Error("network down");
    });
    const timedOut = vi.fn(async () => {
      throw new DOMException("The operation timed out", "TimeoutError");
    });
    await expect(
      makeCounter({
        url: URL_,
        key: KEY,
        env: "production",
        fetchImpl: rejected,
      }).count("/page"),
    ).resolves.toBeUndefined();
    await expect(
      makeCounter({
        url: URL_,
        key: KEY,
        env: "production",
        fetchImpl: timedOut,
      }).count("/page"),
    ).resolves.toBeUndefined();
  });

  it("stops at 20 a minute and starts again in the next minute", async () => {
    let t = 1_000_000;
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response("", { status: 200 }),
    );
    const counter = makeCounter({
      url: URL_,
      key: KEY,
      env: "production",
      fetchImpl,
      now: () => t,
    });
    for (let i = 0; i < 50; i++) await counter.count("/page");
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_COUNTS_PER_MINUTE);
    expect(MAX_COUNTS_PER_MINUTE).toBe(20);
    t += 61_000;
    await counter.count("/page");
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_COUNTS_PER_MINUTE + 1);
  });

  it("never writes the key, the address or an answer to the log", async () => {
    const spies = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
    ];
    const failing = vi.fn(async () => {
      throw new Error(`boom ${URL_} ${KEY}`);
    });
    await makeCounter({
      url: URL_,
      key: KEY,
      env: "production",
      fetchImpl: failing,
    }).count("/page");
    const ok = vi.fn(
      async () => new Response(`secret answer ${KEY}`, { status: 401 }),
    );
    await makeCounter({
      url: URL_,
      key: KEY,
      env: "production",
      fetchImpl: ok,
    }).count("/page");
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});

describe("withErrorCount", () => {
  it("returns the very same response and records a 5xx once", async () => {
    const res = new Response("oops", { status: 503 });
    const record = vi.fn();
    const out = await withErrorCount(async () => res, record);
    expect(out).toBe(res);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(503);
    // The body was not read or cloned.
    expect(res.bodyUsed).toBe(false);
    expect(await out.text()).toBe("oops");
  });

  it("records a 500 a route built itself, such as a lead that could not be saved", async () => {
    const record = vi.fn();
    await withErrorCount(
      async () => new Response('{"error":"db-insert-failed"}', { status: 500 }),
      record,
    );
    expect(record).toHaveBeenCalledWith(500);
  });

  it("records nothing for 2xx, 3xx and 4xx", async () => {
    const record = vi.fn();
    for (const status of [200, 204, 301, 404, 429, 499]) {
      await withErrorCount(
        async () =>
          new Response(null, { status: status === 204 ? 204 : status }),
        record,
      );
    }
    expect(record).not.toHaveBeenCalled();
  });

  it("counts a throw as 500 and throws the same error again", async () => {
    const boom = new Error("handler broke");
    const record = vi.fn();
    await expect(
      withErrorCount(async () => {
        throw boom;
      }, record),
    ).rejects.toBe(boom);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(500);
  });

  it("a recorder that throws changes nothing for the visitor", async () => {
    const res = new Response("oops", { status: 502 });
    const out = await withErrorCount(
      async () => res,
      () => {
        throw new Error("recorder broke");
      },
    );
    expect(out).toBe(res);
    const boom = new Error("handler broke");
    await expect(
      withErrorCount(
        async () => {
          throw boom;
        },
        () => {
          throw new Error("recorder broke");
        },
      ),
    ).rejects.toBe(boom);
  });
});
