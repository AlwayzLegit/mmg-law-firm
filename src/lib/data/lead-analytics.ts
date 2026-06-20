import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyPoint = { date: string; count: number };
export type Ranked = { label: string; count: number };

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "signed"
  | "rejected"
  | "spam";

export const STATUS_ORDER: readonly LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
] as const;

export type LeadAnalytics = {
  windowDays: number;
  total: number;
  /** Real leads only — spam excluded. The denominator for conversion. */
  qualifiedTotal: number;
  byStatus: Record<LeadStatus, number>;
  signed: number;
  spam: number;
  /** signed / (total − spam), rounded to a whole percent. 0 when no real leads. */
  conversionPct: number;
  /** Leads in the most recent 7 days of the window. */
  last7: number;
  /** Leads in the 7 days before that, for week-over-week comparison. */
  prev7: number;
  /** null when prev7 is 0 (avoid divide-by-zero / misleading ∞). */
  weekOverWeekPct: number | null;
  daily: DailyPoint[];
  bySource: Ranked[];
  byPracticeArea: Ranked[];
  byCounty: Ranked[];
  topLandingPages: Ranked[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

type LeadRow = {
  status: LeadStatus;
  created_at: string;
  utm_source: string | null;
  source_url: string | null;
  practice_areas: { name: string } | null;
  counties: { name: string } | null;
};

function rank(
  rows: LeadRow[],
  pick: (r: LeadRow) => string | null | undefined,
  limit: number,
): Ranked[] {
  const tally = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Normalize a source_url to a path so "/contact?utm=x" and "/contact" group. */
function toPath(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).pathname || "/";
  } catch {
    // Already a relative path, or junk — keep the path-looking prefix only.
    const q = url.indexOf("?");
    const path = q === -1 ? url : url.slice(0, q);
    return path.startsWith("/") ? path : null;
  }
}

/**
 * Compute lead analytics over the last `windowDays` from Postgres. Shared by
 * the admin Analytics page and the weekly email digest so both tell the same
 * story. Reads are scoped to the window to keep the payload small.
 */
export async function getLeadAnalytics(
  // The admin server client and service-role client share this surface; we
  // only call .from().select() here so the loose type is intentional.
  supabase: SupabaseClient,
  windowDays = 30,
): Promise<LeadAnalytics> {
  const now = Date.now();
  const since = new Date(
    now - (windowDays - 1) * DAY_MS - DAY_MS,
  ).toISOString();

  const { data } = await supabase
    .from("leads")
    .select(
      "status, created_at, utm_source, source_url, practice_areas(name), counties(name)",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as LeadRow[];

  const byStatus = STATUS_ORDER.reduce(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<LeadStatus, number>,
  );
  for (const r of rows) {
    if (r.status in byStatus) byStatus[r.status] += 1;
  }

  const total = rows.length;
  const spam = byStatus.spam;
  const signed = byStatus.signed;
  const qualifiedTotal = total - spam;
  const conversionPct =
    qualifiedTotal > 0 ? Math.round((signed / qualifiedTotal) * 100) : 0;

  // Week-over-week on real (non-spam) leads.
  const last7Start = now - 7 * DAY_MS;
  const prev7Start = now - 14 * DAY_MS;
  let last7 = 0;
  let prev7 = 0;
  for (const r of rows) {
    if (r.status === "spam") continue;
    const t = new Date(r.created_at).getTime();
    if (t >= last7Start) last7 += 1;
    else if (t >= prev7Start) prev7 += 1;
  }
  const weekOverWeekPct =
    prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;

  // Dense daily series (zeros filled) for an honest chart.
  const daily: DailyPoint[] = [];
  const start = startOfDay(now - (windowDays - 1) * DAY_MS);
  const index = new Map<string, DailyPoint>();
  for (let i = 0; i < windowDays; i++) {
    const iso = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    const point = { date: iso, count: 0 };
    daily.push(point);
    index.set(iso, point);
  }
  for (const r of rows) {
    const point = index.get(r.created_at.slice(0, 10));
    if (point) point.count += 1;
  }

  return {
    windowDays,
    total,
    qualifiedTotal,
    byStatus,
    signed,
    spam,
    conversionPct,
    last7,
    prev7,
    weekOverWeekPct,
    daily,
    bySource: rank(rows, (r) => r.utm_source ?? "(direct / none)", 8),
    byPracticeArea: rank(rows, (r) => r.practice_areas?.name, 8),
    byCounty: rank(rows, (r) => r.counties?.name, 10),
    topLandingPages: rank(rows, (r) => toPath(r.source_url), 8),
  };
}
