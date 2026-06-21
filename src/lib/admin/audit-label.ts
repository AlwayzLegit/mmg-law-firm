/**
 * Humanize an audit_log action code into a short, firm-wide readable label
 * for the dashboard activity feed. Pure — unit-tested. (The per-lead timeline
 * has its own icon-bearing variant; this one is text-only and covers every
 * action the admin emits, including tag and content events.)
 */
export function describeAuditAction(
  action: string,
  diff: Record<string, unknown> | null,
): string {
  const d = diff ?? {};
  const s = (v: unknown) => (v == null ? "?" : String(v));
  switch (action) {
    case "create":
      return "Lead created";
    case "create_spam":
      return "Lead flagged as spam";
    case "status_change":
      return `Status: ${s(d.from)} → ${s(d.to)}`;
    case "bulk_status_change":
      return `Bulk status → ${s(d.to)}`;
    case "conflict_check":
      return `Conflict check — ${s(d.hits)} hit(s)`;
    case "note_added":
      return "Note added";
    case "note_edited":
      return "Note edited";
    case "note_deleted":
      return "Note deleted";
    case "note_pinned":
      return "Note pinned";
    case "note_unpinned":
      return "Note unpinned";
    case "assigned":
      return "Lead assigned";
    case "unassigned":
      return "Lead unassigned";
    case "bulk_assign":
      return "Bulk assigned to admin";
    case "follow_up_set":
      return "Follow-up set";
    case "follow_up_clear":
      return "Follow-up cleared";
    case "tags_updated":
      return "Lead tags updated";
    case "bulk_tag_add":
      return d.tag ? `Bulk tagged: ${s(d.tag)}` : "Bulk tagged";
    case "bulk_tag_remove":
      return d.tag ? `Bulk untagged: ${s(d.tag)}` : "Bulk untagged";
    case "tag_renamed":
      return d.from && d.to
        ? `Tag renamed: ${s(d.from)} → ${s(d.to)}`
        : "Tag renamed";
    case "tag_deleted":
      return d.tag ? `Tag deleted: ${s(d.tag)}` : "Tag deleted";
    case "export_csv":
      return d.rows
        ? `Exported ${s(d.rows)} leads (CSV)`
        : "Exported leads CSV";
    default:
      return action.replace(/_/g, " ");
  }
}
