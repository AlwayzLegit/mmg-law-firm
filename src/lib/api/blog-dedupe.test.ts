import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  findCoveringPost,
  normalizeTitle,
  sameTopic,
  topicKeyFromSlug,
} from "./blog-dedupe";

type Row = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  created_at: string;
};

/** Minimal chainable fake: every query resolves to the whole table; the
 *  function under test does its own filtering. */
function fakeSupabase(rows: Row[]): SupabaseClient {
  return {
    from() {
      const result = { data: rows, error: null };
      const builder: Record<string, unknown> = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") return (resolve: (v: typeof result) => void) => resolve(result);
            return () => builder;
          },
        },
      );
      return builder;
    },
  } as unknown as SupabaseClient;
}

const POSTS: Row[] = [
  { id: "1", slug: "dog-bite-lawyer-california", title: "Dog Bite Lawyer in California", is_published: true, created_at: "2026-07-01" },
  { id: "2", slug: "dog-bite-lawyer-california-2", title: "Dog Bite Lawyer in California: What Victims Should Know", is_published: true, created_at: "2026-07-25" },
  { id: "3", slug: "california-pto-payout-law", title: "California PTO Laws: Vacation Payout Rules", is_published: true, created_at: "2026-10-18" },
  { id: "4", slug: "hit-and-run-accident-california", title: "Hit-and-Run Accident Lawyer in California", is_published: false, created_at: "2026-08-10" },
];

describe("topic keys", () => {
  it("strips numbered suffixes and matches keywords to slug families", () => {
    expect(topicKeyFromSlug("dog-bite-lawyer-california-4")).toBe("dog-bite-lawyer-california");
    expect(topicKeyFromSlug("labor-code-2802")).toBe("labor-code");
    expect(sameTopic("Dog bite lawyer California", "dog-bite-lawyer-california-3")).toBe(true);
    expect(sameTopic("dog bite attorney california", "dog-bite-lawyer-california")).toBe(false);
  });

  it("normalises titles loosely", () => {
    expect(normalizeTitle("Hostile Work Environment in California: Your Rights")).toBe(
      normalizeTitle("Hostile Work Environment in California"),
    );
    expect(normalizeTitle("Final Paycheck Law")).not.toBe(normalizeTitle("Meal Break Law"));
  });
});

describe("findCoveringPost", () => {
  it("returns the published original for a numbered-slug or keyword match", async () => {
    const hit = await findCoveringPost(fakeSupabase(POSTS), { slug: "dog-bite-lawyer-california-5" });
    expect(hit?.id).toBe("1");
    const byKeyword = await findCoveringPost(fakeSupabase(POSTS), { keyword: "dog bite lawyer california" });
    expect(byKeyword?.id).toBe("1");
  });

  it("matches on title when the slug differs", async () => {
    const hit = await findCoveringPost(fakeSupabase(POSTS), {
      slug: "vacation-pay-rules-ca",
      title: "California PTO Laws: Vacation Payout Rules",
    });
    expect(hit?.slug).toBe("california-pto-payout-law");
  });

  it("returns null for a genuinely new topic and honours excludeId", async () => {
    expect(await findCoveringPost(fakeSupabase(POSTS), { title: "Swimming Pool Accident Liability" })).toBeNull();
    expect(
      await findCoveringPost(fakeSupabase(POSTS), { slug: "california-pto-payout-law", excludeId: "3" }),
    ).toBeNull();
  });

  it("still reports an unpublished draft as covering (so the agent doesn't write it twice)", async () => {
    const hit = await findCoveringPost(fakeSupabase(POSTS), { keyword: "hit and run accident california" });
    expect(hit?.id).toBe("4");
    expect(hit?.is_published).toBe(false);
  });
});
