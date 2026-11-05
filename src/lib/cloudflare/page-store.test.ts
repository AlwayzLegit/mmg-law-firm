import { describe, expect, it, vi } from "vitest";

import { cachedPage } from "./page-cache";
import { BUILD_HEADER, objectKey, R2_MAX_SECONDS, tieredPageStore, type PageBucket } from "./page-store";

const PAGE = "https://www.mmg-lawfirm.com/locations/los-angeles-county/burbank";
const ISR = "s-maxage=79167, stale-while-revalidate=2592000";

/** One data center's Cache API. */
function edgeCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (key: string) => store.get(key)?.clone()),
    put: vi.fn(async (key: string, res: Response) => void store.set(key, res)),
  } as unknown as Cache & { store: Map<string, Response> };
}

function bucket() {
  const objects = new Map<string, ArrayBuffer>();
  const b: PageBucket & { objects: Map<string, ArrayBuffer> } = {
    objects,
    get: vi.fn(async (key: string) => {
      const buf = objects.get(key);
      return buf ? { body: new Response(buf).body! } : null;
    }),
    put: vi.fn(async (key: string, value: ArrayBuffer) => void objects.set(key, value)),
  };
  return b;
}

const crawler = () => new Request(PAGE, { headers: { accept: "*/*", "user-agent": "SemrushBot" } });
const page = (body: string, build = "b1") =>
  new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": ISR, [BUILD_HEADER]: build },
  });

async function settle(pending: Promise<unknown>[]) {
  while (pending.length) await Promise.all(pending.splice(0));
}

describe("tieredPageStore", () => {
  it("serves a page rendered in one data center from another, without the app", async () => {
    const r2 = bucket();
    const pending: Promise<unknown>[] = [];
    const waitUntil = (p: Promise<unknown>) => void pending.push(p);
    const render = vi.fn(async () => page("<h1>Burbank</h1>"));
    const t = 1_000_000;

    const lax = tieredPageStore({ edge: edgeCache(), bucket: r2, buildId: "b1", waitUntil, now: () => t });
    const first = await cachedPage(crawler(), lax, render, waitUntil, () => t, "b1");
    expect(first.headers.get("x-edge-cache")).toBe("MISS");
    await first.text();
    await settle(pending);
    expect(r2.objects.size).toBe(1);

    const dfwEdge = edgeCache();
    const dfw = tieredPageStore({ edge: dfwEdge, bucket: r2, buildId: "b1", waitUntil, now: () => t });
    const second = await cachedPage(crawler(), dfw, render, waitUntil, () => t + 5_000, "b1");
    expect(second.headers.get("x-edge-cache")).toBe("HIT");
    expect(second.headers.get("cache-control")).toBe(ISR);
    expect(second.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await second.text()).toBe("<h1>Burbank</h1>");
    expect(render).toHaveBeenCalledTimes(1);

    // The R2 copy is also kept in that data center's cache for next time.
    await settle(pending);
    expect(dfwEdge.store.size).toBe(1);
  });

  it("stores only pages from the build it was deployed with", async () => {
    // During a deploy the front Worker can be ahead of the app: a page from
    // the old build references /_next/static chunks the new deploy lacks.
    const r2 = bucket();
    const edge = edgeCache();
    const store = tieredPageStore({ edge, bucket: r2, buildId: "b2", waitUntil: () => {} });
    await store.put(PAGE, page("old", "b1"));
    await store.put(PAGE, new Response("untagged", { headers: { "cache-control": ISR } }));
    expect(r2.objects.size).toBe(0);
    expect(edge.store.size).toBe(0);

    await store.put(PAGE, page("new", "b2"));
    expect([...r2.objects.keys()]).toEqual([objectKey(PAGE, "b2")]);
    expect(objectKey(PAGE, "b2")).toBe("edge-pages/b2/www.mmg-lawfirm.com/locations/los-angeles-county/burbank");
  });

  it("never stores anything without a build id", async () => {
    const r2 = bucket();
    const store = tieredPageStore({ edge: edgeCache(), bucket: r2, buildId: "", waitUntil: () => {} });
    await store.put(PAGE, page("x", ""));
    expect(r2.put).not.toHaveBeenCalled();
  });

  it("treats a copy older than R2_MAX_SECONDS as missing", async () => {
    const r2 = bucket();
    let t = 1_000_000;
    const now = () => t;
    const writer = tieredPageStore({ edge: edgeCache(), bucket: r2, buildId: "b1", waitUntil: () => {}, now });
    const stored = page("x");
    stored.headers.set("x-edge-stored-at", String(t));
    await writer.put(PAGE, stored);

    t += (R2_MAX_SECONDS + 1) * 1000;
    const reader = tieredPageStore({ edge: edgeCache(), bucket: r2, buildId: "b1", waitUntil: () => {}, now });
    expect(await reader.match(PAGE)).toBeUndefined();
  });
});
