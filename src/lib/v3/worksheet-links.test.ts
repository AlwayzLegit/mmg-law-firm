import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { V3_BY_KEY } from "./pages";

describe("printable worksheet guide links", () => {
  const worksheets = [
    ["mmg-after-california-accident/checklist.html", "after"],
    ["mmg-california-accident-deadlines/deadline-review-worksheet.html", "deadlines"],
    ["mmg-accident-compensation-letter-edition/loss-record-worksheet.html", "comp"],
    ["mmg-how-an-accident-claim-works/consultation-worksheet.html", "process"],
  ];

  it.each(worksheets)("%s links to the published guide", (file, key) => {
    const html = readFileSync(resolve("public/v3", file), "utf8");
    expect(html).toContain(`href="${V3_BY_KEY[key].path}"`);
    expect(html).not.toContain('href="index.html"');
  });

  // Printable companions: the guide is the indexable page.
  it.each(worksheets)("%s has a title and stays out of the index", (file) => {
    const html = readFileSync(resolve("public/v3", file), "utf8");
    expect(html).toMatch(/<title>[^<]+\| MMG Law Firm<\/title>/);
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
  });
});
