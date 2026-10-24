/**
 * Speed-to-lead service levels for intake. A personal-injury lead that is
 * not called back within minutes usually signs with whoever answered first,
 * so "new" leads are measured from arrival to the first staff action.
 */
export const SLA_TARGET_MINUTES = 15;
export const SLA_WARN_MINUTES = 60;

export type SlaTone = "ok" | "warn" | "breach";

export function ageMinutes(createdAt: string | Date, now = Date.now()): number {
  const t = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  return Math.max(0, Math.floor((now - t) / 60000));
}

export function slaTone(minutes: number): SlaTone {
  if (minutes < SLA_TARGET_MINUTES) return "ok";
  if (minutes < SLA_WARN_MINUTES) return "warn";
  return "breach";
}

/** "4m", "47m", "3h 12m", "2d 5h" */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
}
