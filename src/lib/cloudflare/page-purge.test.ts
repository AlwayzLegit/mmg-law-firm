import { describe, expect, it, vi } from "vitest";

import { purgeRules, purgeStoredPages, type PurgeBucket } from "./page-purge";
import { objectKey } from "./page-store";

const HOST = "www.mmg-lawfirm.com";
const key = (path: string, build = "b1") => objectKey(`https://${HOST}${path}?__deploy=${build}`, build);

function bucket(keys: string[], pageSize = 1000) {
  const objects = new Set(keys);
  const b: PurgeBucket & { objects: Set<string> } = {
    objects,
    list: vi.fn(async ({ prefix, cursor }: { prefix: string; cursor?: string }) => {
      const all = [...objects].filter((k) => k.startsWith(prefix)).sort();
      const start = Number(cursor ?? 0);
      const truncated = start + pageSize < all.length;
      return {
        objects: all.slice(start, start + pageSize).map((k) => ({ key: k })),
        truncated,
        cursor: truncated ? String(start + pageSize) : undefined,
      };
    }),
    delete: vi.fn(async (ks: string[]) => ks.forEach((k) => objects.delete(k))),
  };
  return b;
}

const purge = (tags: string[], b: PurgeBucket) => purgeStoredPages({ tags, bucket: b, buildId: "b1", host: HOST });

describe("purgeRules", () => {
  it("maps the tags revalidatePath writes", () => {
    expect(purgeRules("_N_T_/blog")).toEqual([{ prefix: "/blog?" }]);
    expect(purgeRules("_N_T_/")).toEqual([{ prefix: "/?" }]);
    expect(purgeRules("_N_T_/index")).toEqual([{ prefix: "/?" }]);
    expect(purgeRules("_N_T_/layout")).toEqual([{ prefix: "/" }]);
    expect(purgeRules("_N_T_/blog/layout")).toEqual([{ prefix: "/blog?" }, { prefix: "/blog/" }]);
    expect(purgeRules("_N_T_/blog/[slug]/page")).toEqual([{ prefix: "/blog/", depth: 2 }]);
  });

  it("ignores private routes and custom tags, which are never stored", () => {
    expect(purgeRules("_N_T_/admin/content/blog")).toEqual([]);
    expect(purgeRules("firm-settings")).toEqual([]);
  });
});

describe("purgeStoredPages", () => {
  it("drops the revalidated page and leaves its children and neighbours", async () => {
    const b = bucket([key("/blog"), key("/blog/a"), key("/blog-archive"), key("/")]);
    await purge(["_N_T_/blog"], b);
    expect([...b.objects].sort()).toEqual([key("/"), key("/blog-archive"), key("/blog/a")].sort());
  });

  it("drops the home page without touching the rest of the site", async () => {
    const b = bucket([key("/"), key("/blog")]);
    await purge(["_N_T_/", "_N_T_/index"], b);
    expect([...b.objects]).toEqual([key("/blog")]);
    expect(b.list).toHaveBeenCalledTimes(1);
  });

  it("matches a dynamic route only at its own depth", async () => {
    const c = "/locations/los-angeles-county";
    const b = bucket([key(c), key(`${c}/glendale`), key(`${c}/glendale/car-accidents`), key(`${c}/burbank/dog-bites`)]);
    await purge(["_N_T_/locations/[county]/[city]/[practiceArea]/page"], b);
    expect([...b.objects].sort()).toEqual([key(c), key(`${c}/glendale`)].sort());
  });

  it("drops every page on a root layout revalidation, across list pages", async () => {
    const b = bucket([key("/"), key("/a"), key("/b"), key("/c")], 2);
    await purge(["_N_T_/layout"], b);
    expect(b.objects.size).toBe(0);
  });

  it("does not touch another build's pages", async () => {
    const other = key("/blog", "b0");
    const b = bucket([key("/blog"), other]);
    await purge(["_N_T_/blog"], b);
    expect([...b.objects]).toEqual([other]);
  });
});
