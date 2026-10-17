import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured: () => false,
  getStaticSupabase: vi.fn(),
}));

import { getPublishedPosts } from "@/lib/data/blog";
import {
  getAllPublishedCities,
  getPublishedCounties,
  getPublishedLocationPages,
} from "@/lib/data/queries";

describe("sitemap data availability guard", () => {
  it.each([
    ["posts", getPublishedPosts],
    ["cities", getAllPublishedCities],
    ["counties", getPublishedCounties],
    ["location pages", getPublishedLocationPages],
  ] as const)("refuses seed-only %s in sitemap mode", async (_name, query) => {
    await expect(query(true)).rejects.toThrow("published content database");
  });

  it("preserves existing fallback behavior for ordinary page callers", async () => {
    expect(await getPublishedPosts()).toEqual([]);
    expect(await getPublishedLocationPages()).toEqual([]);
    expect((await getPublishedCounties()).length).toBeGreaterThan(0);
    expect((await getAllPublishedCities()).length).toBeGreaterThan(0);
  });
});
