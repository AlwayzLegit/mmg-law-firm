import { existsSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

import { revalidateBlogIndex } from "./revalidate-blog";

describe("revalidateBlogIndex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refreshes /blog and every older index page", () => {
    revalidateBlogIndex();
    expect(cache.revalidatePath.mock.calls).toEqual([
      ["/blog"],
      ["/(marketing)/blog/page/[page]", "page"],
    ]);
  });

  it("names typed routes by folders that exist, route group included", () => {
    // Next tags a page by its file path. A typed path that is not a real
    // folder under src/app matches no page and silently refreshes nothing.
    revalidateBlogIndex();
    const typed = cache.revalidatePath.mock.calls.filter(([, type]) => type);
    expect(typed.length).toBeGreaterThan(0);
    for (const [route, type] of typed) {
      const file = join(process.cwd(), "src", "app", ...route.split("/"), `${type}.tsx`);
      expect(existsSync(file), file).toBe(true);
    }
  });
});
