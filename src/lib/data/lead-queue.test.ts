import { describe, expect, it } from "vitest";

import { neighborsOf, parseLeadFilters } from "./lead-queue";

describe("parseLeadFilters", () => {
  it("parses a full querystring", () => {
    const f = parseLeadFilters(
      new URLSearchParams(
        "status=new&assignee=unassigned&tag=vip&source=google&q=jane",
      ),
    );
    expect(f).toMatchObject({
      status: "new",
      assignee: "unassigned",
      tag: "vip",
      source: "google",
      q: "jane",
      due: false,
    });
  });

  it("defaults unknown status/assignee to all", () => {
    const f = parseLeadFilters(
      new URLSearchParams("status=bogus&assignee=bogus"),
    );
    expect(f.status).toBe("all");
    expect(f.assignee).toBe("all");
  });

  it("reads the due flag", () => {
    expect(parseLeadFilters(new URLSearchParams("due=1")).due).toBe(true);
  });

  it("sanitizes the search term", () => {
    expect(parseLeadFilters(new URLSearchParams("q=a%25b")).q).not.toContain(
      "%",
    );
  });
});

describe("neighborsOf", () => {
  const ids = ["a", "b", "c"];

  it("returns both neighbors for a middle item", () => {
    expect(neighborsOf(ids, "b")).toEqual({
      prevId: "a",
      nextId: "c",
      index: 1,
      total: 3,
    });
  });

  it("has no prev for the first item", () => {
    expect(neighborsOf(ids, "a")).toMatchObject({
      prevId: null,
      nextId: "b",
      index: 0,
    });
  });

  it("has no next for the last item", () => {
    expect(neighborsOf(ids, "c")).toMatchObject({
      prevId: "b",
      nextId: null,
      index: 2,
    });
  });

  it("reports index -1 when the lead isn't in the queue", () => {
    expect(neighborsOf(ids, "z")).toMatchObject({
      prevId: null,
      nextId: null,
      index: -1,
    });
  });
});
