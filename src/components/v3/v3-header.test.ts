import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/public-content", () => ({
  getPublicContentFlags: async () => ({ hasBlogPosts: true }),
}));

import { V3Header } from "./v3-header";

/** The header's own synchronous sub-components; next/link and V3Img stay as elements. */
const LOCAL = new Set(["SpecialtyMenu", "SmallMenu", "List"]);

/** Walk the tree, expanding the header's own sub-components so their links count. */
function elements(node: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    if (typeof child.type === "function" && LOCAL.has(child.type.name)) {
      const rendered = (child.type as (p: unknown) => ReactNode)(child.props);
      return [child.props, ...elements(rendered)];
    }
    return [child.props, ...elements(child.props.children)];
  });
}

describe("header homepage navigation", () => {
  it("keeps a crawlable logo link without speculative homepage downloads", async () => {
    const logo = elements(await V3Header()).find((props) => props.className === "v3h-logo");
    expect(logo?.href).toBe("/");
    expect(logo?.prefetch).toBe(false);
    expect(logo?.["aria-label"]).toContain("homepage");
  });

  it("retains the existing prefetch behavior on other navigation links", async () => {
    const links = elements(await V3Header()).filter((props) => typeof props.href === "string" && props.href !== "/");
    expect(links.length).toBeGreaterThan(10);
    expect(links.every((props) => props.prefetch === undefined)).toBe(true);
  });
});
