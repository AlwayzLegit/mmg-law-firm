import { Children, isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  effects: [] as Array<() => void>,
  captureClientException: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useEffect: (effect: () => void) => hooks.effects.push(effect),
}));
vi.mock("./load-client-monitoring", () => ({
  captureClientException: hooks.captureClientException,
}));

import AppError from "@/app/(marketing)/error";
import AdminRootError from "@/app/(admin)/error";
import RootError from "@/app/global-error";
import { FIRM } from "@/lib/constants";

function elements(node: ReactNode): Array<Record<string, unknown>> {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return [];
    return [child.props, ...elements(child.props.children)];
  });
}

describe("public error boundary monitoring and recovery", () => {
  beforeEach(() => {
    hooks.effects.length = 0;
    hooks.captureClientException.mockClear();
  });

  for (const [name, Component] of [["app", AppError], ["admin-root", AdminRootError], ["root", RootError]] as const) {
    it(`${name} forwards the exact exception from its effect`, () => {
      const error = Object.assign(new Error("mocked boundary"), { digest: "unit-digest" });
      const warn = vi.spyOn(console, "error").mockImplementation(() => {});
      Component({ error, reset: vi.fn() });
      expect(hooks.captureClientException).not.toHaveBeenCalled();
      expect(hooks.effects).toHaveLength(1);
      hooks.effects[0]();
      expect(hooks.captureClientException).toHaveBeenCalledExactlyOnceWith(error);
      warn.mockRestore();
    });

    it(`${name} retains reset and the existing recovery destination`, () => {
      const reset = vi.fn();
      const props = elements(Component({ error: new Error("mocked"), reset }));
      const retry = props.find(p => typeof p.onClick === "function");
      expect(retry).toBeDefined();
      (retry!.onClick as () => void)();
      expect(reset).toHaveBeenCalledTimes(1);
      expect(props.some(p => p.href === (name === "root" ? "/" : `tel:${FIRM.phoneTel}`))).toBe(true);
      expect(hooks.captureClientException).not.toHaveBeenCalled();
    });
  }
});
