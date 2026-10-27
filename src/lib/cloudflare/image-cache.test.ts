import { describe, expect, it, vi } from "vitest";

import { cachedImage, IMAGE_CACHE_CONTROL, imageCacheKey, imageFormat, isImageRequest } from "./image-cache";

const IMG = "https://www.mmg-lawfirm.com/_next/image?url=%2Fv3%2Fphotos%2Fhero.webp&w=1200&q=65";

function memoryCache() {
  const store = new Map<string, Response>();
  return {
    store,
    match: vi.fn(async (key: string) => store.get(key)?.clone()),
    put: vi.fn(async (key: string, res: Response) => void store.set(key, res)),
  } as unknown as Cache & { store: Map<string, Response> };
}

const img = (accept = "image/avif,image/webp,*/*") => new Request(IMG, { headers: { accept } });

describe("image edge cache", () => {
  it("keys on the negotiated format, not just the URL", () => {
    expect(imageFormat("image/avif,image/webp,*/*")).toBe("avif");
    expect(imageFormat("image/webp,*/*")).toBe("webp");
    expect(imageFormat(null)).toBe("orig");
    expect(imageCacheKey(img())).not.toBe(imageCacheKey(img("image/webp")));
    expect(imageCacheKey(img())).toContain("w=1200");
  });

  it("only handles GET /_next/image", () => {
    expect(isImageRequest(img())).toBe(true);
    expect(isImageRequest(new Request("https://www.mmg-lawfirm.com/contact"))).toBe(false);
    expect(isImageRequest(new Request(IMG, { method: "POST" }))).toBe(false);
  });

  it("renders once, then serves later requests from the cache", async () => {
    const cache = memoryCache();
    const pending: Promise<unknown>[] = [];
    const render = vi.fn(async () => new Response("avif-bytes", { headers: { "content-type": "image/avif" } }));

    const first = await cachedImage(img(), cache, render, (p) => pending.push(p));
    expect(first.headers.get("cache-control")).toBe(IMAGE_CACHE_CONTROL);
    expect(await first.text()).toBe("avif-bytes");
    await Promise.all(pending);

    const second = await cachedImage(img(), cache, render, (p) => pending.push(p));
    expect(await second.text()).toBe("avif-bytes");
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("keeps an existing Cache-Control and never stores errors", async () => {
    const cache = memoryCache();
    const immutable = "public, max-age=31536000, immutable";
    const ok = await cachedImage(img(), cache, async () => new Response("x", { headers: { "cache-control": immutable } }), () => {});
    expect(ok.headers.get("cache-control")).toBe(immutable);

    const missing = await cachedImage(img("image/webp"), cache, async () => new Response("no", { status: 404 }), () => {});
    expect(missing.status).toBe(404);
    expect(cache.put).toHaveBeenCalledTimes(1);
  });
});
