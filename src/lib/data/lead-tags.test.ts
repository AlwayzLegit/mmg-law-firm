import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getTagVocabulary } from "./lead-tags";

/** Chainable Supabase stub that resolves to canned rows for `from()`. */
function fakeSupabase(rows: unknown[]): SupabaseClient {
  return {
    from() {
      const result = { data: rows, error: null };
      const builder: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (resolve: (v: typeof result) => void) => resolve(result);
            }
            return () => builder;
          },
        },
      );
      return builder;
    },
  } as unknown as SupabaseClient;
}

describe("getTagVocabulary", () => {
  it("returns distinct tags ordered by usage", async () => {
    const supabase = fakeSupabase([
      { tags: ["vip", "spanish"] },
      { tags: ["vip"] },
      { tags: ["referral", "vip"] },
    ]);
    const vocab = await getTagVocabulary(supabase);
    expect(vocab[0]).toBe("vip"); // most used first
    expect(vocab).toContain("spanish");
    expect(vocab).toContain("referral");
    expect(new Set(vocab).size).toBe(vocab.length); // distinct
  });

  it("respects the limit", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ tags: [`t${i}`] }));
    const vocab = await getTagVocabulary(fakeSupabase(rows), 10);
    expect(vocab).toHaveLength(10);
  });

  it("handles no leads", async () => {
    expect(await getTagVocabulary(fakeSupabase([]))).toEqual([]);
  });
});
