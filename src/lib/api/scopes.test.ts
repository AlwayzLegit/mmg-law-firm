import { describe, expect, it } from "vitest";

import { hasScope, isScope, normalizeScopes } from "./scopes";

describe("scopes", () => {
  it("star grants everything", () => {
    expect(hasScope(new Set(["*"]), "blog:publish")).toBe(true);
    expect(hasScope(["*"], "agent:admin")).toBe(true);
  });
  it("exact scope only", () => {
    expect(hasScope(["blog:read"], "blog:read")).toBe(true);
    expect(hasScope(["blog:read"], "blog:write")).toBe(false);
  });
  it("normalizes and drops unknowns", () => {
    expect(normalizeScopes([" blog:read ", "nope", "blog:read", "agent:write"])).toEqual([
      "blog:read",
      "agent:write",
    ]);
    expect(isScope("leads:read")).toBe(true);
    expect(isScope("leads:write")).toBe(false);
  });
});
