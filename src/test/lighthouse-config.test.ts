import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readConfig = (formFactor: string) =>
  JSON.parse(readFileSync(`.lighthouserc.${formFactor}.json`, "utf8"));

const expectedPaths = [
  "/",
  "/contact",
  "/attorneys/mihran-ghazaryan",
  "/practice-areas",
  "/practice-areas/car-accidents",
  "/practice-areas/truck-accidents",
  "/practice-areas/motorcycle-accidents",
  "/locations",
];

describe.each(["mobile", "desktop"])("%s Lighthouse coverage", (formFactor) => {
  it("covers the three priority accident pages without losing existing pages", () => {
    const urls: string[] = readConfig(formFactor).ci.collect.url;
    expect(urls).toEqual(expectedPaths.map((path) => `http://localhost:3000${path}`));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("preserves the existing score budgets and warning policy", () => {
    expect(readConfig(formFactor).ci.assert.assertions).toEqual({
      "categories:performance": ["warn", { minScore: 0.9 }],
      "categories:accessibility": ["warn", { minScore: 0.95 }],
      "categories:best-practices": ["warn", { minScore: 0.95 }],
      "categories:seo": ["warn", { minScore: 1 }],
    });
  });
});

it("keeps mobile and desktop as distinct measurement configurations", () => {
  expect(readConfig("mobile").ci.collect.settings?.preset).toBeUndefined();
  expect(readConfig("desktop").ci.collect.settings.preset).toBe("desktop");
});

it("uses three mobile samples so one favorable run does not define the result", () => {
  expect(readConfig("mobile").ci.collect.numberOfRuns).toBe(3);
});
