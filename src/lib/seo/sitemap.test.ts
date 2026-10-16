import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/seo/canonical", () => ({
  siteUrl: () => "https://www.mmg-lawfirm.com",
  canonicalUrl: (p: string) =>
    `https://www.mmg-lawfirm.com${p === "/" ? "" : p}`,
}));
vi.mock("@/lib/data/attorney", () => ({
  getAttorneyProfile: async () => null,
}));
vi.mock("@/lib/data/public-content", () => ({
  getPublicContentFlags: async () => ({ hasBlogPosts: true }),
}));
vi.mock("@/lib/data/blog", () => ({
  getPublishedPosts: vi.fn(async () => [
    {
      slug: "example",
      published_at: "2020-01-01",
      hero_image_url: "/image.jpg",
    },
  ]),
}));
vi.mock("@/lib/data/queries", () => ({
  getPublishedCounties: async () => [
    { slug: "example-county", updated_at: "2026-01-01" },
  ],
  getAllPublishedCities: async () => [
    { county_slug: "example-county", slug: "city", updated_at: null },
  ],
  getPublishedLocationPages: async () => [
    {
      county_slug: "example-county",
      city_slug: "city",
      practice_area_slug: "truck-accidents",
      local_angle_md: "Verified local detail",
      updated_at: "2026-01-02",
    },
    {
      county_slug: "example-county",
      city_slug: "recent-city",
      practice_area_slug: "truck-accidents",
      local_angle_md: "More recently verified local detail",
      updated_at: "2026-10-16T00:01:00Z",
    },
    {
      county_slug: "example-county",
      city_slug: "empty",
      practice_area_slug: "car-accidents",
      local_angle_md: "   ",
    },
    {
      county_slug: "example-county",
      city_slug: "moto-city",
      practice_area_slug: "motorcycle-accidents",
      local_angle_md: "Unique motorcycle context",
      updated_at: "2026-01-02",
    },
    {
      county_slug: "example-county",
      city_slug: "recent-moto-city",
      practice_area_slug: "motorcycle-accidents",
      local_angle_md: "Recently approved local motorcycle body",
      updated_at: "2026-10-16T04:24:45Z",
    },
  ],
}));
import { getSitemapEntries, validSitemapDate } from "./sitemap-entries";
import { getPublishedPosts } from "@/lib/data/blog";
import {
  SITEMAP_GROUPS,
  sitemapGroup,
  sitemapIndexXml,
  sitemapXml,
} from "./sitemap-xml";
import robots from "@/app/robots";
import { GET as childGet } from "@/app/sitemaps/[file]/route";

describe("sitemap integrity", () => {
  it("does not publish an incomplete sitemap after a data failure", async () => {
    vi.mocked(getPublishedPosts).mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      await expect(getSitemapEntries()).rejects.toThrow("database unavailable");
      expect(getPublishedPosts).toHaveBeenCalledWith(true);
    } finally {
      warning.mockRestore();
    }
  });
  it("preserves all eligible entries across disjoint groups", async () => {
    const entries = await getSitemapEntries();
    const grouped = SITEMAP_GROUPS.flatMap((group) =>
      entries.filter((entry) => sitemapGroup(entry.url) === group),
    );
    expect(grouped.map((e) => e.url).sort()).toEqual(
      entries.map((e) => e.url).sort(),
    );
    expect(new Set(grouped.map((e) => e.url)).size).toBe(entries.length);
  });
  it("includes every practice hub and excludes empty local copy", async () => {
    const urls = (await getSitemapEntries()).map((e) => e.url);
    for (const topic of SITEMAP_GROUPS.slice(0, 3))
      expect(urls).toContain(
        `https://www.mmg-lawfirm.com/practice-areas/${topic}`,
      );
    expect(urls.some((u) => u.includes("/empty/"))).toBe(false);
  });
  it("does not invent lastmod for static pages or use blog publication as modification", async () => {
    const entries = await getSitemapEntries();
    expect(
      entries.find((e) => e.url.endsWith("/practice-areas/car-accidents"))
        ?.lastModified,
    ).toBeUndefined();
    expect(
      entries.find((e) => e.url.endsWith("/blog/example"))?.lastModified,
    ).toBeUndefined();
    expect(
      entries.find((e) => e.url.endsWith("/example-county"))?.lastModified,
    ).toEqual(new Date("2026-01-01"));
  });
  it("omits missing invalid and future dates", () => {
    for (const value of [null, undefined, "", "not a date", "2999-01-01"])
      expect(validSitemapDate(value)).toBeUndefined();
  });
  it("accounts for approved shared-copy edits without stamping unrelated pages", async () => {
    const entries = await getSitemapEntries();
    expect(entries.find((e) => e.url.endsWith("/example-county/city/truck-accidents"))?.lastModified)
      .toEqual(new Date("2026-10-16"));
    expect(entries.find((e) => e.url.endsWith("/practice-areas/bicycle-accidents"))?.lastModified)
      .toEqual(new Date("2026-10-16"));
    expect(entries.find((e) => e.url.endsWith("/practice-areas/employment-law"))?.lastModified)
      .toBeUndefined();
    expect(entries.find((e) => e.url.endsWith("/example-county/recent-city/truck-accidents"))?.lastModified)
      .toEqual(new Date("2026-10-16T00:01:00Z"));
  });
  it("produces four absolute sitemap links", () => {
    const xml = sitemapIndexXml();
    expect(xml.match(/<sitemap>/g)).toHaveLength(4);
    for (const group of SITEMAP_GROUPS)
      expect(xml).toContain(
        `https://www.mmg-lawfirm.com/sitemaps/${group}.xml`,
      );
  });
  it("uses the motorcycle city revision but preserves a later CMS edit and excludes its hub", async () => {
    const entries = await getSitemapEntries();
    expect(entries.find((e) => e.url.endsWith("/moto-city/motorcycle-accidents"))?.lastModified)
      .toEqual(new Date("2026-10-16T04:22:42Z"));
    expect(entries.find((e) => e.url.endsWith("/recent-moto-city/motorcycle-accidents"))?.lastModified)
      .toEqual(new Date("2026-10-16T04:24:45Z"));
    expect(entries.find((e) => e.url.endsWith("/practice-areas/motorcycle-accidents"))?.lastModified)
      .toBeUndefined();
  });
  it("escapes XML and retains image discovery", () => {
    const xml = sitemapXml([
      {
        url: "https://example.com/a?x=1&y=2",
        images: ['https://example.com/image?a="b"&c=d'],
      },
    ]);
    expect(xml).toContain("x=1&amp;y=2");
    expect(xml).toContain("a=&quot;b&quot;&amp;c=d");
    expect(xml).toContain("<image:image>");
    expect(xml).not.toContain("<lastmod>");
  });
  it("routes service pages to the right topic", () => {
    expect(
      sitemapGroup(
        "https://www.mmg-lawfirm.com/locations/a/b/motorcycle-accidents",
      ),
    ).toBe("motorcycle-accidents");
    expect(sitemapGroup("https://www.mmg-lawfirm.com/contact")).toBe("other");
  });
  it("rejects unknown sitemap files", async () => {
    const response = await childGet(new Request("https://example.com"), {
      params: Promise.resolve({ file: "invalid.xml" }),
    });
    expect(response.status).toBe(404);
  });
  it("serves XML with only the requested topic", async () => {
    const response = await childGet(new Request("https://example.com"), {
      params: Promise.resolve({ file: "truck-accidents.xml" }),
    });
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    const xml = await response.text();
    expect(xml).toContain("/practice-areas/truck-accidents");
    expect(xml).not.toContain("/practice-areas/car-accidents");
  });
  it("preserves robots crawl rules without unsupported Host", () => {
    expect(robots().host).toBeUndefined();
    expect(robots().sitemap).toBe("https://www.mmg-lawfirm.com/sitemap.xml");
    expect(robots().rules).toEqual([
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login"] },
    ]);
  });
});
