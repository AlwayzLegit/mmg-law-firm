import { describe, expect, it } from "vitest";

import {
  buildArticle,
  buildBreadcrumbList,
  buildFaqPage,
  buildReviewsSchema,
} from "./schema";
import { canonicalUrl } from "./canonical";

describe("buildBreadcrumbList", () => {
  it("emits 1-based positions with canonical item URLs", () => {
    const node = buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Contact", path: "/contact" },
    ]);
    expect(node["@type"]).toBe("BreadcrumbList");
    const items = node.itemListElement as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      position: 1,
      name: "Home",
      item: canonicalUrl("/"),
    });
    expect(items[1]).toMatchObject({
      position: 2,
      item: canonicalUrl("/contact"),
    });
  });
});

describe("buildFaqPage", () => {
  it("maps each item to a Question/Answer pair", () => {
    const node = buildFaqPage([
      { question: "Do you charge upfront?", answer: "No — contingency." },
    ]);
    expect(node["@type"]).toBe("FAQPage");
    const entities = node.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(1);
    expect(entities[0]["@type"]).toBe("Question");
    expect(entities[0].name).toBe("Do you charge upfront?");
    expect((entities[0].acceptedAnswer as Record<string, unknown>).text).toBe(
      "No — contingency.",
    );
  });
});

describe("buildReviewsSchema", () => {
  it("returns null when there are no approved reviews (CRPC §7.1)", () => {
    expect(buildReviewsSchema([])).toBeNull();
  });

  it("computes an aggregate rating and review count", () => {
    const node = buildReviewsSchema([
      { id: "1", initials: "A.B.", quote: "Great", rating: 5 },
      { id: "2", initials: "C.D.", quote: "Good", rating: 4 },
    ]);
    expect(node).not.toBeNull();
    const agg = node!.aggregateRating as Record<string, unknown>;
    expect(agg.ratingValue).toBe(4.5);
    expect(agg.reviewCount).toBe(2);
    expect(agg.bestRating).toBe(5);
  });

  it("rounds the average to one decimal place", () => {
    const node = buildReviewsSchema([
      { id: "1", initials: "A", quote: "x", rating: 5 },
      { id: "2", initials: "B", quote: "y", rating: 5 },
      { id: "3", initials: "C", quote: "z", rating: 4 },
    ]);
    const agg = node!.aggregateRating as Record<string, unknown>;
    expect(agg.ratingValue).toBe(4.7); // 14/3 = 4.666… → 4.7
  });

  it("clamps out-of-range ratings and defaults missing ones to 5", () => {
    const node = buildReviewsSchema([
      { id: "1", initials: "A", quote: "x", rating: 9 }, // clamps to 5
      { id: "2", initials: "B", quote: "y" }, // defaults to 5
    ]);
    const reviews = node!.review as Array<Record<string, unknown>>;
    expect(
      (reviews[0].reviewRating as Record<string, unknown>).ratingValue,
    ).toBe(5);
    expect(
      (reviews[1].reviewRating as Record<string, unknown>).ratingValue,
    ).toBe(5);
  });
});

describe("buildArticle", () => {
  it("falls back dateModified to datePublished when not given", () => {
    const node = buildArticle({
      title: "T",
      description: "D",
      path: "/blog/post",
      publishedAt: "2026-01-01T00:00:00Z",
    });
    expect(node.dateModified).toBe("2026-01-01T00:00:00Z");
    expect(node.mainEntityOfPage).toBe(canonicalUrl("/blog/post"));
  });

  it("wraps a provided image in an array, omits it otherwise", () => {
    const withImg = buildArticle({
      title: "T",
      description: "D",
      path: "/blog/post",
      image: "https://example.com/a.png",
    });
    expect(withImg.image).toEqual(["https://example.com/a.png"]);

    const without = buildArticle({ title: "T", description: "D", path: "/x" });
    expect(without.image).toBeUndefined();
  });
});
