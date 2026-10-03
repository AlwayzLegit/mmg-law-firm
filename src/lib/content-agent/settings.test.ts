import { describe, expect, it } from "vitest";

import { AgentSettings, parseSettings } from "./settings";

describe("AgentSettings", () => {
  it("fills defaults", () => {
    const s = parseSettings({});
    expect(s.auto_publish).toBe(false);
    expect(s.posts_per_run).toBe(1);
    expect(s.internal_links.min).toBe(3);
    expect(s.notify_on).toContain("failure");
  });
  it("strict schema rejects unknown keys, lenient parse drops them", () => {
    expect(AgentSettings.safeParse({ bogus: 1 }).success).toBe(false);
    const s = parseSettings({ bogus: 1, max_words: 1500 });
    expect(s.max_words).toBe(1500);
  });
  it("falls back to defaults on invalid values", () => {
    const s = parseSettings({ posts_per_run: 99 });
    expect(s.posts_per_run).toBe(1);
  });
});
