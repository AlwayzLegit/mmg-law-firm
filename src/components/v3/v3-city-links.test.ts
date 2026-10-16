import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { V3CityLinks } from "./v3-city-links";

const links = Array.from({ length: 66 }, (_, i) => ({
  href: `/locations/county/city-${i}/car-accidents`,
  label: `City ${i} car accidents`,
}));
const render = (deferOffscreen?: boolean) => renderToStaticMarkup(createElement(V3CityLinks, {
  heading: "Car Accidents representation by city",
  intro: "Original introduction.",
  links,
  deferOffscreen,
}));

describe("off-screen city directory rendering", () => {
  it("preserves every server-rendered link and word, with no client fetch or hidden state", () => {
    const baseline = render();
    const deferred = render(true);
    expect(deferred.replace("v3-page v3-city-directory-deferred", "v3-page")
      .replace(";--city-link-count:66", "")).toBe(baseline);
    expect((deferred.match(/<a /g) ?? []).length).toBe(66);
    expect(deferred).not.toMatch(/aria-hidden="true"[^>]*><div|display:none|content-visibility:hidden/);
    for (const link of links) expect(deferred).toContain(`href="${link.href}"`);
  });

  it("leaves other callers unchanged and handles empty directories", () => {
    expect(render(false)).toBe(render());
    expect(render()).not.toContain("--city-link-count");
    expect(renderToStaticMarkup(createElement(V3CityLinks, { heading: "Empty", links: [], deferOffscreen: true }))).toBe("");
  });

  it("opts in only the three accident hubs without changing metadata generation", () => {
    const route = readFileSync("src/app/(marketing)/practice-areas/[slug]/page.tsx", "utf8");
    expect(route).toContain('deferOffscreen={["car-accidents", "truck-accidents", "motorcycle-accidents"].includes(slug)}');
    const city = readFileSync("src/app/(marketing)/locations/[county]/[city]/page.tsx", "utf8");
    expect(city).not.toContain("deferOffscreen");
  });

  it("uses auto rather than hidden, with screen-only estimates and a focus override", () => {
    const css = readFileSync("src/components/v3/v3.css", "utf8").replace(/\r\n/g, "\n");
    expect(css).toContain("@media screen {\n  .v3-city-directory-deferred {");
    expect(css).toContain("content-visibility: auto;");
    expect(css).toContain("contain-intrinsic-block-size: auto calc(var(--city-link-count) * 64px + 240px);");
    expect(css).toContain(".v3-city-directory-deferred:focus-within {\n    content-visibility: visible;");
    expect(css).not.toContain("content-visibility: hidden");
  });
});
