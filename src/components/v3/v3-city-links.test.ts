import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { V3CityLinks } from "./v3-city-links";

function luminance(hex: string) {
  const channels = hex.match(/[\da-f]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe("city directory accessibility", () => {
  const heading = "Car Accidents representation by city";
  const links = [{ href: "/locations/los-angeles/glendale/car-accidents", label: "Glendale car accidents" }];
  const html = () => renderToStaticMarkup(createElement(V3CityLinks, { heading, intro: "Directory introduction", links }));

  it("uses the existing bronze text token with normal-text AA contrast", () => {
    const markup = html();
    expect(markup).toContain('color:var(--color-brand-500)">SERVING CALIFORNIA</p>');
    expect(markup).toContain("background:#fbf8f1");
    const css = readFileSync("src/components/v3/v3.css", "utf8");
    const color = css.match(/--color-brand-500:\s*(#[\da-f]{6})/i)?.[1];
    expect(color).toBe("#8a5a1c");
    expect((luminance("#fbf8f1") + 0.05) / (luminance(color!) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });

  it("preserves visible text, semantic heading, links and decorative arrows", () => {
    const markup = html();
    expect(markup).toContain(`${heading}</h2>`);
    expect(markup).toContain("Directory introduction</p>");
    expect(markup).toContain(`href="${links[0].href}"`);
    expect(markup).toContain(links[0].label);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("font-size:14px;letter-spacing:.2em");
    expect(markup).not.toContain("tabindex");
    expect(markup).not.toContain("<meta");
  });

  it("does not render an empty directory", () => {
    expect(renderToStaticMarkup(createElement(V3CityLinks, { heading, links: [] }))).toBe("");
  });
});
