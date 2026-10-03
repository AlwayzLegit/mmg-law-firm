import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import LeadsChart from "@/components/admin/leads-chart";
import {
  AdminPageHeader,
  EmptyNote,
  Panel,
  RankBars,
  SegmentedControl,
  StatCard,
  adminCode,
} from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";
import { getWebAnalytics } from "@/lib/data/web-analytics";
import {
  formatMinutes,
  getConversionBreakdowns,
  getLeadAnalytics,
  getMonthlyTrend,
  getResponseTimeStats,
  STATUS_ORDER,
  type ConversionRow,
  type MonthlyPoint,
} from "@/lib/data/lead-analytics";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];

/** Pipeline segment colours — match the lead status pills. */
const STATUS_FILL: Record<string, string> = {
  new: "bg-status-new",
  contacted: "bg-gold",
  qualified: "bg-[#16a34a]",
  signed: "bg-ink",
  rejected: "bg-ink/25",
  spam: "bg-[#dc2626]/70",
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdmin();
  const { range: rangeParam } = await searchParams;
  const parsedRange = Number.parseInt(rangeParam ?? "", 10);
  const range: Range = (RANGES as readonly number[]).includes(parsedRange)
    ? (parsedRange as Range)
    : 90;

  const supabase = await getServerSupabase();
  const webPromise = getWebAnalytics();
  const [a, response, conversion, monthly] = await Promise.all([
    getLeadAnalytics(supabase, range),
    getResponseTimeStats(supabase, range),
    getConversionBreakdowns(supabase, range),
    getMonthlyTrend(supabase, 12),
  ]);
  const web = await webPromise;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Insights"
        title="Analytics"
        description={`Lead activity from Postgres over the last ${range} days. Conversion excludes spam. Click any county or status on the leads page to drill in.`}
        actions={
          <SegmentedControl
            label="Date range"
            items={RANGES.map((r) => ({
              href: r === 90 ? "/admin/analytics" : `/admin/analytics?range=${r}`,
              label: r === 365 ? "1 year" : `${r} days`,
              active: range === r,
            }))}
          />
        }
      />

      {/* Headline KPIs */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Leads (${range}d)`} value={a.qualifiedTotal} sub="excludes spam" />
        <StatCard
          label="Last 7 days"
          value={
            <span className="inline-flex items-baseline gap-2">
              {a.last7}
              <Delta value={a.weekOverWeekPct} />
            </span>
          }
          sub={a.weekOverWeekPct === null ? "vs prior week" : `vs ${a.prev7} prior week`}
        />
        <StatCard label={`Signed (${range}d)`} value={a.signed} sub="retained clients" tone="good" />
        <StatCard label="Conversion" value={`${a.conversionPct}%`} sub="signed ÷ real leads" />
      </div>

      {/* First-response speed — the #1 lever on intake conversion. */}
      <Panel className="mt-6" title={`First response time (${range}d)`}>
        {response.sample === 0 ? (
          <EmptyNote>
            {response.pending > 0
              ? `${response.pending} lead(s) awaiting a first response, and none answered yet in this window.`
              : `No responded leads in the last ${range} days yet.`}
          </EmptyNote>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Mini label="Median response" value={formatMinutes(response.medianMinutes ?? 0)} hint={`${response.sample} responded`} />
              <Mini label="Within 1 hour" value={`${response.within1hPct ?? 0}%`} hint="of responded leads" />
              <Mini label="Within 24 hours" value={`${response.within24hPct ?? 0}%`} hint="of responded leads" />
              <Mini label="Awaiting response" value={String(response.pending)} hint="open, never touched" />
            </div>
            <p className="text-stone mt-3 text-xs">
              Measured from submission to the first staff action (status change, note, assignment, or conflict check).
            </p>
          </>
        )}
      </Panel>

      <Panel className="mt-6" title={`Daily leads (last ${range} days)`}>
        <LeadsChart data={a.daily} />
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`Funnel (${range}d)`}>
          {a.total === 0 ? (
            <EmptyNote>No leads in the last {range} days.</EmptyNote>
          ) : (
            <StackedPipeline total={a.total} byStatus={a.byStatus} />
          )}
        </Panel>

        <Panel title={`Lead source (${range}d)`}>
          <RankBars rows={a.bySource} />
        </Panel>
        <Panel title={`Practice area (${range}d)`}>
          <RankBars rows={a.byPracticeArea} />
        </Panel>
        <Panel title={`Top counties (${range}d)`}>
          <RankBars rows={a.byCounty} />
        </Panel>
        <Panel title={`Top landing pages (${range}d)`}>
          <RankBars rows={a.topLandingPages} />
        </Panel>
      </div>

      {/* Conversion / ROI — which channels actually sign clients, not just
          generate volume. */}
      <SectionHeading
        title="Conversion & ROI"
        description={`Leads vs. signed clients per channel over the last ${range} days. Sorted by signed — a loud source that never signs ranks below a quiet one that does.`}
      />
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <ConversionPanel title={`By source (${range}d)`} rows={conversion.bySource} />
        <ConversionPanel title={`By practice area (${range}d)`} rows={conversion.byPracticeArea} />
        <ConversionPanel title={`By county (${range}d)`} rows={conversion.byCounty} />
        <Panel title="Monthly trend (12 mo)">
          <MonthlyTrend points={monthly} />
        </Panel>
      </div>

      {/* Website traffic — from PostHog pageviews (independent 7/30d windows). */}
      <SectionHeading title="Website traffic" />
      {!web.configured ? (
        <Panel className="mt-4">
          <EmptyNote>
            Connect PostHog to see traffic here — set <code className={adminCode}>POSTHOG_PERSONAL_API_KEY</code> and{" "}
            <code className={adminCode}>POSTHOG_PROJECT_ID</code>.
          </EmptyNote>
        </Panel>
      ) : !web.hasData ? (
        <Panel className="mt-4">
          <EmptyNote>No pageviews recorded yet. Once the site is live and receiving visitors, traffic appears here.</EmptyNote>
        </Panel>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitors (7d)" value={web.visitors7} sub="unique" />
            <StatCard label="Pageviews (7d)" value={web.pageviews7} />
            <StatCard label="Visitors (30d)" value={web.visitors30} sub="unique" />
            <StatCard label="Pageviews (30d)" value={web.pageviews30} />
          </div>

          <Panel className="mt-6" title="Pageviews (last 14 days)">
            <LeadsChart data={web.daily} />
          </Panel>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Top pages (30d)">
              <RankBars rows={web.topPages} />
            </Panel>
            <Panel title="Top referrers (30d)">
              <RankBars rows={web.topReferrers} />
            </Panel>
          </div>

          {/* Behavioral funnel — visit → form view → start → submit (30d). */}
          <Panel className="mt-6" title="Visitor funnel (30d)">
            <WebFunnel steps={web.funnel} />
            <p className="text-stone mt-4 text-xs">
              Unique people at each stage. {web.phoneClicks} phone-number click{web.phoneClicks === 1 ? "" : "s"} in the same
              window (an alternate conversion not shown in the bars).
            </p>
          </Panel>

          {/* Live event feed — everything happening on the site. */}
          <Panel className="mt-6" title="Recent activity">
            {web.recentEvents.length === 0 ? (
              <EmptyNote>No recent events.</EmptyNote>
            ) : (
              <ul className="divide-line m-0 list-none divide-y p-0 text-[13px]">
                {web.recentEvents.map((e, i) => (
                  <li key={`${e.ts}-${i}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={`inline-block h-2 w-2 flex-none rounded-full ${EVENT_DOT[e.event] ?? "bg-stone/50"}`} aria-hidden />
                      <span className="font-medium">{EVENT_LABEL[e.event] ?? e.event}</span>
                      {e.path ? <span className="text-stone min-w-0 truncate">{e.path}</span> : null}
                    </span>
                    <time className="text-stone flex-none text-xs" dateTime={e.ts}>
                      {formatEventTime(e.ts)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  $pageview: "Page view",
  lead_form_viewed: "Viewed lead form",
  lead_form_started: "Started lead form",
  lead_submitted: "Submitted lead",
  phone_click: "Clicked phone number",
};

const EVENT_DOT: Record<string, string> = {
  $pageview: "bg-stone/40",
  lead_form_viewed: "bg-status-new/50",
  lead_form_started: "bg-status-new",
  lead_submitted: "bg-[#16a34a]",
  phone_click: "bg-gold",
};

/** Compact relative time for the activity feed (e.g. "3m", "2h", "5d"). */
function formatEventTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const secs = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mt-10">
      <h2 className="font-display m-0 text-[22px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
      {description ? <p className="text-stone mt-1 max-w-[70ch] text-[13px]">{description}</p> : null}
    </div>
  );
}

/** Small inline KPI used inside a panel. */
function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-ink/3 rounded-[10px] px-4 py-3">
      <p className="micro-label text-stone m-0">{label}</p>
      <p className="font-display m-0 mt-1.5 text-[26px] leading-none font-semibold tracking-[-0.02em]">{value}</p>
      {hint ? <p className="text-stone m-0 mt-1 text-xs">{hint}</p> : null}
    </div>
  );
}

/** Pipeline as one stacked bar + legend, instead of six separate bars. */
function StackedPipeline({ total, byStatus }: { total: number; byStatus: Record<string, number> }) {
  const segments = STATUS_ORDER.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
    pct: total > 0 ? Math.round(((byStatus[status] ?? 0) / total) * 100) : 0,
  }));
  return (
    <div>
      <div className="bg-ink/6 flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label="Lead pipeline breakdown">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.status}
              className={cn("h-full", STATUS_FILL[s.status])}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.status}: ${s.count} (${s.pct}%)`}
            />
          ))}
      </div>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0 sm:grid-cols-2">
        {segments.map((s) => (
          <li key={s.status} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="inline-flex items-center gap-2 capitalize">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", STATUS_FILL[s.status])} aria-hidden />
              {s.status}
            </span>
            <span className="font-semibold tabular-nums">
              {s.count} <span className="text-stone text-xs font-normal">({s.pct}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebFunnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = steps[0]?.count ?? 0;
  if (top === 0) return <EmptyNote>No funnel data in the last 30 days yet.</EmptyNote>;
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {steps.map((s, i) => {
        const pctOfTop = Math.round((s.count / top) * 100);
        const prev = i > 0 ? steps[i - 1].count : s.count;
        const stepPct = prev > 0 ? Math.round((s.count / prev) * 100) : 0;
        return (
          <li key={s.label} className="text-[13px]">
            <div className="flex items-center justify-between">
              <span>{s.label}</span>
              <span className="font-semibold tabular-nums">
                {s.count}{" "}
                <span className="text-stone text-xs font-normal">{i === 0 ? `(${pctOfTop}%)` : `(${stepPct}% of prior)`}</span>
              </span>
            </div>
            <div className="bg-ink/6 mt-1 h-2 w-full overflow-hidden rounded-full">
              <div className="bg-ink h-full rounded-full" style={{ width: `${pctOfTop}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-stone inline-flex items-center gap-0.5 font-sans text-xs font-medium tracking-normal">
        <Minus className="h-3 w-3" aria-hidden />
        new
      </span>
    );
  }
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-sans text-xs font-semibold tracking-normal",
        up ? "text-[#15803d]" : "text-[#b91c1c]",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(value)}%
    </span>
  );
}

const CONV_COLS = "grid-cols-[minmax(0,1fr)_56px_56px_56px]";

function ConversionPanel({ title, rows }: { title: string; rows: ConversionRow[] }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <EmptyNote>No data yet.</EmptyNote>
      ) : (
        <div>
          <div className={cn("micro-label text-stone border-line grid gap-3 border-b pb-2", CONV_COLS)}>
            <span>Channel</span>
            <span className="text-right">Leads</span>
            <span className="text-right">Signed</span>
            <span className="text-right">Rate</span>
          </div>
          <ul className="divide-line m-0 list-none divide-y p-0">
            {rows.map((r) => (
              <li key={r.label} className={cn("grid items-center gap-3 py-2 text-[13px] tabular-nums", CONV_COLS)}>
                {r.href ? (
                  <Link href={r.href} className="text-foreground hover:text-gold-deep min-w-0 truncate no-underline" title={`View ${r.label} leads`}>
                    {r.label}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate">{r.label}</span>
                )}
                <span className="text-stone text-right">{r.leads}</span>
                <span className="text-right font-semibold text-[#15803d]">{r.signed}</span>
                <span className={cn("text-right", r.signedPct > 0 ? "font-semibold" : "text-stone")}>{r.signedPct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function MonthlyTrend({ points }: { points: MonthlyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.leads));
  const fmt = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-US", { month: "short" });
  };
  return (
    <div>
      <div className="flex h-32 items-end gap-1.5">
        {points.map((p) => (
          <div key={p.month} className="flex flex-1 flex-col items-center gap-1" title={`${p.month}: ${p.leads} leads, ${p.signed} signed`}>
            <div className="flex w-full flex-1 items-end">
              <div className="bg-ink/10 relative w-full overflow-hidden rounded-t-[4px]" style={{ height: `${Math.round((p.leads / max) * 100)}%` }}>
                {/* Signed portion fills from the bottom. */}
                <div
                  className="bg-gold absolute inset-x-0 bottom-0"
                  style={{ height: p.leads ? `${Math.round((p.signed / p.leads) * 100)}%` : "0%" }}
                />
              </div>
            </div>
            <span className="text-stone text-[10px]">{fmt(p.month)}</span>
          </div>
        ))}
      </div>
      <p className="text-stone mt-3 text-xs">Bar height = leads; gold portion = signed.</p>
    </div>
  );
}
