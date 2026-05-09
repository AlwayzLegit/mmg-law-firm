export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

const STATUS_SET: ReadonlySet<string> = new Set(LEAD_STATUSES);

export function isValidStatus(s: unknown): s is LeadStatus {
  return typeof s === "string" && STATUS_SET.has(s);
}
