import { describe, expect, it } from "vitest";

import { canonicalUrl, defaultOgImageUrl, siteUrl } from "./canonical";

describe("canonicalUrl", () => {
  it("returns the bare site URL for the homepage", () => {
    expect(canonicalUrl("/")).toBe(siteUrl());
  });

  it("returns the absolute URL for a typical page path", () => {
    expect(canonicalUrl("/contact")).toBe(`${siteUrl()}/contact`);
  });

  it("preserves nested paths with multiple segments", () => {
    expect(
      canonicalUrl("/locations/los-angeles-county/glendale/car-accidents"),
    ).toBe(
      `${siteUrl()}/locations/los-angeles-county/glendale/car-accidents`,
    );
  });

  it("throws on a path that doesn't start with a slash", () => {
    expect(() => canonicalUrl("contact")).toThrow();
  });

  it("does not double the trailing slash on '/'", () => {
    const url = canonicalUrl("/");
    expect(url.endsWith("/")).toBe(false);
  });
});

describe("defaultOgImageUrl", () => {
  it("returns the absolute URL of the generated OG image", () => {
    expect(defaultOgImageUrl()).toBe(`${siteUrl()}/opengraph-image`);
  });
});
