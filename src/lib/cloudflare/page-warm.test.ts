import { describe, expect, it, vi } from "vitest";

import { cachedPage } from "./page-cache";
import { objectKey, tieredPageStore, type PageBucket } from "./page-store";
import { pagesToWarm, pageUrl, WARM_LIMIT, warmStoredPages } from "./page-warm";

const HOST = "www.mmg-lawfirm.com";
const BUILD = "b1";
const key = (path: string) => objectKey(`https://${HOST}${path}?__deploy=${BUILD}`, BUILD);
const ISR = "s-maxage=3600, stale-while-revalidate=2592000";

function bucket() {
  const objects = new Map<string, ArrayBuffer>();
  const b: PageBucket & { objects: Map<string, ArrayBuffer> } = {
    objects,
    get: vi.fn(async (k: string) => {
      const buf = objects.get(k);
      return buf ? { body: new Response(buf).body! } : null;
    }),
    put: vi.fn(async (k: string, value: ArrayBuffer) => void objects.set(k, value)),
  };
  return b;
}

const html = (body: string) =>
  new Response(body, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": ISR } });

describe("pageUrl", () => {
  it("rebuilds the page's URL without the store's deploy marker", () => {
    expect(pageUrl(key("/blog"), BUILD).toString()).toBe(`https://${HOST}/blog`);
    expect(pageUrl(key("/"), BUILD).toString()).toBe(`https://${HOST}/`);
    const paged = objectKey(`https://${HOST}/blog?__deploy=${BUILD}&page=2`, BUILD);
    expect(pageUrl(paged, BUILD).toString()).toBe(`https://${HOST}/blog?page=2`);
  });
});

describe("pagesToWarm", () => {
  it("takes the shallowest pages first, up to the limit", () => {
    const keys = [key("/locations/a/b/c"), key("/blog/post"), key("/"), key("/contact"), key("/blog")];
    expect(pagesToWarm(keys, 3)).toEqual([key("/"), key("/blog"), key("/contact")]);
    expect(pagesToWarm(keys)).toHaveLength(5);
    expect(pagesToWarm(Array.from({ length: 900 }, (_, i) => key(`/p/${i}`)))).toHaveLength(WARM_LIMIT);
  });
});

describe("warmStoredPages", () => {
  it("stores a rendered page so the front Worker serves it as a hit", async () => {
    const r2 = bucket();
    const render = vi.fn(async (req: Request) => html(`<h1>${new URL(req.url).pathname}</h1>`));
    const t = 1_000_000;

    const stored = await warmStoredPages({ keys: [key("/blog")], render, bucket: r2, buildId: BUILD, now: () => t });
    expect(stored).toBe(1);
    expect(render.mock.calls[0][0].url).toBe(`https://${HOST}/blog`);
    expect([...r2.objects.keys()]).toEqual([key("/blog")]);

    const edge = { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) } as unknown as Cache;
    const store = tieredPageStore({ edge, bucket: r2, buildId: BUILD, waitUntil: () => {}, now: () => t + 5_000 });
    const visitor = new Request(`https://${HOST}/blog`, { headers: { accept: "*/*" } });
    const res = await cachedPage(visitor, store, vi.fn(), () => {}, () => t + 5_000, BUILD);
    expect(res.headers.get("x-edge-cache")).toBe("HIT");
    expect(res.headers.get("cache-control")).toBe(ISR);
    expect(await res.text()).toBe("<h1>/blog</h1>");
  });

  it("skips pages Next did not mark shareable and keeps going after a failure", async () => {
    const r2 = bucket();
    const render = vi.fn(async (req: Request) => {
      const path = new URL(req.url).pathname;
      if (path === "/login") return new Response("x", { headers: { "cache-control": "private, no-store" } });
      if (path === "/broken") throw new Error("render failed");
      if (path === "/missing") return new Response("gone", { status: 404, headers: { "cache-control": ISR } });
      return html("ok");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const keys = [key("/login"), key("/broken"), key("/missing"), key("/contact")];
    expect(await warmStoredPages({ keys, render, bucket: r2, buildId: BUILD })).toBe(1);
    expect([...r2.objects.keys()]).toEqual([key("/contact")]);
  });

  it("does nothing with no keys", async () => {
    const r2 = bucket();
    const render = vi.fn();
    expect(await warmStoredPages({ keys: [], render, bucket: r2, buildId: BUILD })).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });
});
