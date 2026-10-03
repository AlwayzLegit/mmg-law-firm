import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_SITE_URL: "https://www.mmg-lawfirm.com" },
}));

import type { ApiPrincipal } from "@/lib/api/auth";
import { assembleBrief, type BriefInputs } from "./brief";
import { parseSettings } from "./settings";

function principal(scopes: string[]): ApiPrincipal {
  return { kind: "key", id: "k", name: "k", prefix: "p", scopes: new Set(scopes), rateLimitPerHour: 600 };
}

function inputs(over: Partial<BriefInputs> = {}): BriefInputs {
  return {
    now: new Date("2026-10-03T12:00:00Z"),
    principal: principal(["agent:read", "agent:write", "blog:write"]),
    instructions: {
      version: 3,
      body_md: "# rules",
      settings: parseSettings({ auto_publish: true, max_review_backlog: 1 }),
      created_at: "2026-10-01T00:00:00Z",
    },
    claimed: [],
    upcoming: Array.from({ length: 15 }, (_, i) => ({
      id: `t${i}`, keyword: `kw ${i}`, intent: "informational", practice_area: null, county: null, city: null,
      target_url: null, title_hint: null, priority: i, volume: null, kd: null, cpc: null, notes: null,
    })),
    topicCounts: { queued: 15 },
    recentPosts: [],
    keywordCoverage: [{ keyword: "neck injury lawyer", slug: "neck" }],
    reviewBacklog: [
      { id: "a", title: "A", created_at: "2026-10-01T00:00:00Z" },
      { id: "b", title: "B", created_at: "2026-10-02T00:00:00Z" },
    ],
    postCounts: { published: 3, needs_review: 2, created_last_7d: 1 },
    answers: [],
    openQuestionsCount: 1,
    siteUrls: { practice_areas: [], counties: [], locations: [], legal: [], static: ["/"], truncated: false, total_locations: 0 },
    seoIssues: Array.from({ length: 40 }, (_, i) => ({ post_id: `p${i}`, title: "t", issue: "i", severity: "low" })),
    lastRun: { id: "r", status: "succeeded", started_at: "x", finished_at: "y", summary_md: "z".repeat(5000), posts_created: [] },
    ...over,
  };
}

describe("assembleBrief", () => {
  it("may_publish needs BOTH auto_publish and the blog:publish scope", () => {
    expect(assembleBrief(inputs()).policy.may_publish).toBe(false);
    const withScope = inputs({ principal: principal(["blog:publish"]) });
    expect(assembleBrief(withScope).policy.may_publish).toBe(true);
    const off = inputs({
      principal: principal(["*"]),
      instructions: { version: 1, body_md: "x", settings: parseSettings({ auto_publish: false }), created_at: "" },
    });
    expect(assembleBrief(off).policy.may_publish).toBe(false);
  });

  it("pauses drafting when the review backlog exceeds the limit", () => {
    const b = assembleBrief(inputs());
    expect(b.policy.pause_drafting).toBe(true);
    expect(b.policy.pause_reason).toMatch(/2 posts await review/);
    const ok = assembleBrief(inputs({ reviewBacklog: [] }));
    expect(ok.policy.pause_drafting).toBe(false);
  });

  it("caps lists and truncates the last-run summary", () => {
    const b = assembleBrief(inputs());
    expect(b.topics.upcoming).toHaveLength(10);
    expect(b.seo_issues).toHaveLength(25);
    expect(b.last_run?.summary_md?.length).toBe(2000);
  });

  it("carries firm facts and verbatim disclaimers", () => {
    const b = assembleBrief(inputs());
    expect(b.site.firm.name).toBe("MMG Law Firm");
    expect(b.site.disclaimers.general).toMatch(/general information purposes only/);
    expect(b.site.base_url).toBe("https://www.mmg-lawfirm.com");
  });

  it("works with no instructions row (defaults)", () => {
    const b = assembleBrief(inputs({ instructions: null, principal: null }));
    expect(b.instructions).toBeNull();
    expect(b.policy.may_publish).toBe(false);
    expect(b.policy.min_words).toBe(1200);
  });
});
