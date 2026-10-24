import { afterEach, describe, expect, it, vi } from "vitest";

async function load(flag: string | undefined) {
  vi.resetModules();
  if (flag === undefined) vi.stubEnv("NEXT_PUBLIC_LOCALE_PAGES_LIVE", "");
  else vi.stubEnv("NEXT_PUBLIC_LOCALE_PAGES_LIVE", flag);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example.com");
  return import("./routes");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("locale routes", () => {
  it("is unpublished by default: no alternates, switcher still resolves", async () => {
    const r = await load(undefined);
    expect(r.localePagesLive()).toBe(false);
    expect(r.localeAlternates("/")).toBeUndefined();
    expect(r.switcherLinks("/contact")).toEqual([
      { locale: "en", href: "/contact" },
      { locale: "hy", href: "/hy/contact" },
      { locale: "ru", href: "/ru/contact" },
    ]);
  });

  it("publishes hreflang alternates for the two localized pages only when live", async () => {
    const r = await load("1");
    expect(r.localePagesLive()).toBe(true);
    expect(r.localeAlternates("/contact")).toEqual({
      "en-US": "https://www.example.com/contact",
      hy: "https://www.example.com/hy/contact",
      ru: "https://www.example.com/ru/contact",
      "x-default": "https://www.example.com/contact",
    });
    expect(r.localeAlternates("/practice-areas")).toBeUndefined();
  });
});
