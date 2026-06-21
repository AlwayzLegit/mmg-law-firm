import { describe, expect, it } from "vitest";

import { describeAuditAction } from "./audit-label";

describe("describeAuditAction", () => {
  it("formats a status change with from/to", () => {
    expect(
      describeAuditAction("status_change", { from: "new", to: "signed" }),
    ).toBe("Status: new → signed");
  });

  it("handles missing diff fields gracefully", () => {
    expect(describeAuditAction("status_change", null)).toBe("Status: ? → ?");
  });

  it("includes the tag for bulk tag actions", () => {
    expect(describeAuditAction("bulk_tag_add", { tag: "vip" })).toBe(
      "Bulk tagged: vip",
    );
    expect(describeAuditAction("bulk_tag_add", null)).toBe("Bulk tagged");
  });

  it("formats a tag rename", () => {
    expect(
      describeAuditAction("tag_renamed", { from: "vip", to: "high" }),
    ).toBe("Tag renamed: vip → high");
  });

  it("formats a CSV export with the row count", () => {
    expect(describeAuditAction("export_csv", { rows: 42 })).toBe(
      "Exported 42 leads (CSV)",
    );
  });

  it("falls back to a de-underscored action for unknown codes", () => {
    expect(describeAuditAction("some_new_action", null)).toBe(
      "some new action",
    );
  });
});
