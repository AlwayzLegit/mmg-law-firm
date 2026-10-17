import { Children, isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { V3AttorneyPage } from "./attorney";

function elements(node: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return [child.props, ...elements(child.props.children)];
  });
}

describe("attorney breadcrumb", () => {
  it("keeps Home crawlable without prefetching the homepage hero", () => {
    const home = elements(V3AttorneyPage()).filter((props) => props.href === "/");
    expect(home).toHaveLength(1);
    expect(home[0].children).toBe("Home");
    expect(home[0].prefetch).toBe(false);
  });
});
