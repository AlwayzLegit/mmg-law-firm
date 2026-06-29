import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyPoint = { date: string; count: number };
/** A ranked row. `href` (optional) drills into the matching filtered leads. */
export type Ranked = { label: string; count: number; href?: string };

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
  practice_areas: { name: string; slug: string } | null;
  counties: { name: string; slug: string } | null;
};

function rank(
  rows: LeadRow[],
  pick: (r: LeadRow) => string | null | undefined,
  limit: number,
  hrefFor?: (label: string) => string | undefined,
): Ranked[] {
  const tally = new Map<string, number>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()]
    .map(([label, count]) => ({ label, count, href: hrefFor?.(label) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Rank by a {name, slug} dimension, linking each row to its filtered leads. */
function rankBySlug(
  rows: LeadRow[],
  pick: (r: LeadRow) => { name: string; slug: string } | null | undefined,
  hrefBase: string,
  limit: number,
): Ranked[] {
  const tally = new Map<string, { count: number; slug: string }>();
  for (const row of rows) {
    const v = pick(row);
    if (!v?.name) continue;
    const cur = tally.get(v.name) ?? { count: 0, slug: v.slug };
    cur.count += 1;
    tally.set(v.name, cur);
  }
  return [...tally.entries()]
    .map(([label, { count, slug }]) => ({
      label,
      count,
      href: slug ? `${hrefBase}${encodeURIComponent(slug)}` : undefined,
    }))
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
      "status, created_at, utm_source, source_url, practice_areas(name, slug), counties(name, slug)",
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
    bySource: rank(
      rows,
      (r) => r.utm_source ?? "(direct / none)",
      8,
      (label) =>
        label === "(direct / none)"
          ? undefined
          : `/admin/leads?source=${encodeURIComponent(label)}`,
    ),
    byPracticeArea: rankBySlug(
      rows,
      (r) => r.practice_areas,
      "/admin/leads?pa=",
      8,
    ),
    byCounty: rankBySlug(rows, (r) => r.counties, "/admin/leads?county=", 10),
    topLandingPages: rank(rows, (r) => toPath(r.source_url), 8),
  };
}

export type ResponseStats = {
  /** Leads in the window (non-spam) that have received a first staff touch. */
  sample: number;
  medianMinutes: number | null;
  within1hPct: number | null;
  within24hPct: number | null;
  /** Open leads in the window still awaiting any staff response. */
  pending: number;
};

// Audit actions that count as a genuine first staff response to a lead.
const RESPONSE_ACTIONS = [
  "status_change",
  "note_added",
  "assigned",
  "conflict_check",
];

/**
 * First-response-time stats: how fast the firm engages a new lead, measured
 * from the lead's created_at to the earliest staff action in the audit log
 * (status change, note, assignment, or conflict check). Lead intake is the
 * #1 lever on conversion for a PI firm, so this is the metric to watch.
 */
export async function getResponseTimeStats(
  supabase: SupabaseClient,
  windowDays = 30,
): Promise<ResponseStats> {
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();

  const { data: leadRows } = await supabase
    .from("leads")
    .select("id, created_at, status")
    .gte("created_at", since)
    .neq("status", "spam");

  const leads = (leadRows ?? []) as Array<{
    id: string;
    created_at: string;
    status: string;
  }>;
  if (leads.length === 0) {
    return {
      sample: 0,
      medianMinutes: null,
      within1hPct: null,
      within24hPct: null,
      pending: 0,
    };
  }

  const { data: eventRows } = await supabase
    .from("audit_log")
    .select("entity_id, ts")
    .eq("entity", "leads")
    .in(
      "entity_id",
      leads.map((l) => l.id),
    )
    .not("actor_id", "is", null)
    .in("action", RESPONSE_ACTIONS)
    .order("ts", { ascending: true });

  // Earliest staff event per lead (rows are ts-ascending, so first wins).
  const firstTouch = new Map<string, string>();
  for (const e of (eventRows ?? []) as Array<{
    entity_id: string;
    ts: string;
  }>) {
    if (!firstTouch.has(e.entity_id)) firstTouch.set(e.entity_id, e.ts);
  }

  const minutes: number[] = [];
  let pending = 0;
  for (const l of leads) {
    const t = firstTouch.get(l.id);
    if (t) {
      const m =
        (new Date(t).getTime() - new Date(l.created_at).getTime()) / 60000;
      if (m >= 0) minutes.push(m);
    } else if (l.status !== "signed" && l.status !== "rejected") {
      pending += 1; // still open and never touched
    }
  }

  const sample = minutes.length;
  if (sample === 0) {
    return {
      sample: 0,
      medianMinutes: null,
      within1hPct: null,
      within24hPct: null,
      pending,
    };
  }

  minutes.sort((a, b) => a - b);
  const mid = Math.floor(sample / 2);
  const median =
    sample % 2 === 0 ? (minutes[mid - 1] + minutes[mid]) / 2 : minutes[mid];

  const pct = (n: number) => Math.round((n / sample) * 100);
  return {
    sample,
    medianMinutes: Math.round(median),
    within1hPct: pct(minutes.filter((m) => m <= 60).length),
    within24hPct: pct(minutes.filter((m) => m <= 1440).length),
    pending,
  };
}

/** One row of a conversion/ROI breakdown: how a channel converts to signed. */
export type ConversionRow = {
  label: string;
  leads: number;
  signed: number;
  /** signed / leads, whole percent. */
  signedPct: number;
  href?: string;
};

export type ConversionBreakdowns = {
  bySource: ConversionRow[];
  byPracticeArea: ConversionRow[];
  byCounty: ConversionRow[];
};

type ConvRow = {
  status: LeadStatus;
  utm_source: string | null;
  practice_areas: { name: string; slug: string } | null;
  counties: { name: string; slug: string } | null;
};

/** Tally leads + signed per dimension, ranked by signed (ROI), then volume. */
function convRank(
  rows: ConvRow[],
  pick: (r: ConvRow) => { name: string; slug: string } | { name: string } | null | undefined,
  hrefBase: string | null,
  limit: number,
): ConversionRow[] {
  const tally = new Map<
    string,
    { leads: number; signed: number; slug: string | null }
  >();
  for (const row of rows) {
    if (row.status === "spam") continue; // spam isn't a real lead
    const v = pick(row);
    if (!v?.name) continue;
    const slug = "slug" in v ? v.slug : null;
    const cur = tally.get(v.name) ?? { leads: 0, signed: 0, slug };
    cur.leads += 1;
    if (row.status === "signed") cur.signed += 1;
    tally.set(v.name, cur);
  }
  return [...tally.entries()]
    .map(([label, { leads, signed, slug }]) => ({
      label,
      leads,
      signed,
      signedPct: leads > 0 ? Math.round((signed / leads) * 100) : 0,
      href:
        hrefBase && slug
          ? `${hrefBase}${encodeURIComponent(slug)}`
          : undefined,
    }))
    .sort((a, b) => b.signed - a.signed || b.leads - a.leads)
    .slice(0, limit);
}

/**
 * Conversion / ROI breakdowns: for each source, practice area, and county,
 * how many leads it produced AND how many became signed clients. This is the
 * ROI lens the volume rankings can't give — a channel can be loud but never
 * sign, or quiet but convert.
 */
export async function getConversionBreakdowns(
  supabase: SupabaseClient,
  windowDays = 90,
): Promise<ConversionBreakdowns> {
  const since = new Date(Date.now() - windowDays * DAY_MS).toISOString();
  const { data } = await supabase
    .from("leads")
    .select(
      "status, utm_source, practice_areas(name, slug), counties(name, slug)",
    )
    .gte("created_at", since);
  const rows = (data ?? []) as unknown as ConvRow[];

  return {
    bySource: convRank(
      rows,
      (r) => (r.utm_source ? { name: r.utm_source } : null),
      "/admin/leads?source=",
      8,
    ),
    byPracticeArea: convRank(
      rows,
      (r) => r.practice_areas,
      "/admin/leads?pa=",
      8,
    ),
    byCounty: convRank(rows, (r) => r.counties, "/admin/leads?county=", 10),
  };
}

export type MonthlyPoint = {
  /** "YYYY-MM". */
  month: string;
  leads: number;
  signed: number;
};

/**
 * Month-by-month lead + signed counts for a longer-horizon trend than the
 * windowed daily series. Non-spam leads only.
 */
export async function getMonthlyTrend(
  supabase: SupabaseClient,
  months = 12,
): Promise<MonthlyPoint[]> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (months - 1));

  const { data } = await supabase
    .from("leads")
    .select("status, created_at")
    .gte("created_at", start.toISOString())
    .neq("status", "spam");
  const rows = (data ?? []) as Array<{ status: string; created_at: string }>;

  // Seed every month in range so the trend has no gaps.
  const index = new Map<string, MonthlyPoint>();
  const order: string[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const point = { month: key, leads: 0, signed: 0 };
    index.set(key, point);
    order.push(key);
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 7);
    const point = index.get(key);
    if (!point) continue;
    point.leads += 1;
    if (r.status === "signed") point.signed += 1;
  }
  return order.map((k) => index.get(k)!);
}

/** Humanize a minutes value for display ("42m", "3.5h", "2.1d"). */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${(min / 60).toFixed(1)}h`;
  return `${(min / 1440).toFixed(1)}d`;
}
