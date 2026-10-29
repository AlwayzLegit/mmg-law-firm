import { describe, expect, it, vi } from "vitest";

import { cachedPage, FRESH_SECONDS, isCacheableDocumentRequest, isShareable, pageCacheKey } from "./page-cache";

const PAGE = "https://www.mmg-lawfirm.com/practice-areas/car-accidents";
const ISR = "s-maxage=79167, stale-while-revalidate=2592000";

function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (key: string) => store.get(key)?.clone()),
    put: vi.fn(async (key: string, res: Response) => void store.set(key, res)),
  } as unknown as Cache & { store: Map<string, Response>; put: ReturnType<typeof vi.fn> };
}

const doc = (url = PAGE, headers: Record<string, string> = {}) =>
  new Request(url, { headers: { accept: "text/html", "sec-fetch-dest": "document", ...headers } });
const html = (body: string, cc = ISR, extra: Record<string, string> = {}) =>
  new Response(body, { headers: { "content-type": "text/html", "cache-control": cc, ...extra } });

describe("which requests use the page cache", () => {
  it("takes public document loads only", () => {
    expect(isCacheableDocumentRequest(doc())).toBe(true);
    expect(isCacheableDocumentRequest(new Request(PAGE, { headers: { accept: "text/html" } }))).toBe(true);
    expect(isCacheableDocumentRequest(doc(PAGE, { rsc: "1" }))).toBe(false);
    expect(isCacheableDocumentRequest(doc(`${PAGE}?_rsc=abc`))).toBe(false);
    expect(isCacheableDocumentRequest(doc(PAGE, { "sec-fetch-dest": "empty" }))).toBe(false);
    expect(isCacheableDocumentRequest(new Request(PAGE, { method: "POST", headers: { accept: "text/html" } }))).toBe(false);
  });

  it("never touches private routes, the API or signed-in admins", () => {
    for (const p of ["/admin", "/admin/leads", "/login", "/reset-password", "/auth/confirm", "/api/leads"])
      expect(isCacheableDocumentRequest(doc(`https://www.mmg-lawfirm.com${p}`))).toBe(false);
    expect(isCacheableDocumentRequest(doc(PAGE, { cookie: "sb-bpsf-auth-token=abc" }))).toBe(false);
    expect(isCacheableDocumentRequest(doc(PAGE, { cookie: "_ga=GA1.1; theme=dark" }))).toBe(true);
  });

  it("shares one copy across ad-click parameters but not real ones", () => {
    expect(pageCacheKey(doc(`${PAGE}?utm_source=google&gclid=x`))).toBe(PAGE);
    expect(pageCacheKey(doc(`https://www.mmg-lawfirm.com/blog?page=2&utm_medium=cpc`))).toBe(
      "https://www.mmg-lawfirm.com/blog?page=2",
    );
  });

  it("stores only what Next marked shareable", () => {
    expect(isShareable(html("x"))).toBe(true);
    expect(isShareable(html("x", "private, no-cache, no-store, max-age=0, must-revalidate"))).toBe(false);
    expect(isShareable(html("x", ISR, { "set-cookie": "sb=1" }))).toBe(false);
    expect(isShareable(new Response("missing", { status: 404, headers: { "cache-control": ISR } }))).toBe(false);
    expect(isShareable(new Response("x"))).toBe(false);
  });
});

describe("cachedPage", () => {
  it("renders once, then serves the stored copy with Next's own headers", async () => {
    const cache = memoryCache();
    const pending: Promise<unknown>[] = [];
    const render = vi.fn(async () => html("v1"));
    let t = 1_000_000;

    const first = await cachedPage(doc(), cache, render, (p) => pending.push(p), () => t);
    expect(first.headers.get("x-edge-cache")).toBe("MISS");
    expect(await first.text()).toBe("v1");
    await Promise.all(pending);

    t += 5_000;
    const second = await cachedPage(doc(`${PAGE}?utm_source=x`), cache, render, (p) => pending.push(p), () => t);
    expect(second.headers.get("x-edge-cache")).toBe("HIT");
    expect(second.headers.get("cache-control")).toBe(ISR);
    expect(second.headers.has("x-edge-stored-at")).toBe(false);
    expect(await second.text()).toBe("v1");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("serves a stale copy and refreshes it in the background", async () => {
    const cache = memoryCache();
    const pending: Promise<unknown>[] = [];
    let version = 1;
    const render = vi.fn(async () => html(`v${version}`));
    let t = 1_000_000;
    await cachedPage(doc(), cache, render, (p) => pending.push(p), () => t);
    await Promise.all(pending.splice(0));

    version = 2;
    t += (FRESH_SECONDS + 1) * 1000;
    const stale = await cachedPage(doc(), cache, render, (p) => pending.push(p), () => t);
    expect(stale.headers.get("x-edge-cache")).toBe("STALE");
    expect(await stale.text()).toBe("v1");
    await Promise.all(pending.splice(0));

    const fresh = await cachedPage(doc(), cache, render, (p) => pending.push(p), () => t + 1000);
    expect(fresh.headers.get("x-edge-cache")).toBe("HIT");
    expect(await fresh.text()).toBe("v2");
  });

  it("passes dynamic pages and errors through without storing them", async () => {
    const cache = memoryCache();
    const dynamic = await cachedPage(doc(), cache, async () => html("d", "private, no-store"), () => {});
    expect(dynamic.headers.has("x-edge-cache")).toBe(false);
    await cachedPage(doc(), cache, async () => new Response("boom", { status: 500 }), () => {});
    expect(cache.put).not.toHaveBeenCalled();
  });
});
