import { expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { revalidatePath } from "next/cache";
import { revalidateSitemaps } from "./revalidate-sitemaps";

it("invalidates the index and every topic partition", () => {
  vi.mocked(revalidatePath).mockClear();
  revalidateSitemaps();
  expect(vi.mocked(revalidatePath).mock.calls).toEqual([
    ["/sitemap.xml"],
    ["/sitemaps/car-accidents.xml"],
    ["/sitemaps/truck-accidents.xml"],
    ["/sitemaps/motorcycle-accidents.xml"],
    ["/sitemaps/other.xml"],
  ]);
});
