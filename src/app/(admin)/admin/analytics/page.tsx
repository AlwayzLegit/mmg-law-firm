import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import LeadsChart from "@/components/admin/leads-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import { getWebAnalytics } from "@/lib/data/web-analytics";
import {
  formatMinutes,
  getLeadAnalytics,
  getResponseTimeStats,
  STATUS_ORDER,
  type Ranked,
} from "@/lib/data/lead-analytics";

const RANGES = [7, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const parsedRange = Number.parseInt(rangeParam ?? "", 10);
  const range: Range = (RANGES as readonly number[]).includes(parsedRange)
    ? (parsedRange as Range)
    : 90;

  const supabase = await getServerSupabase();
  const webPromise = getWebAnalytics();
  const [a, response] = await Promise.all([
    getLeadAnalytics(supabase, range),
    getResponseTimeStats(supabase, range),
  ]);
  const web = await webPromise;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Analytics
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Lead activity from Postgres over the last {range} days. Conversion
        excludes spam. Click any county or status on the leads page to drill in.
      </p>

      <nav
        className="mt-4 flex flex-wrap items-center gap-2"
        aria-label="Date range"
      >
        <span className="text-muted-foreground text-xs">Range:</span>
        {RANGES.map((r) => (
          <Link
            key={r}
            href={r === 90 ? "/admin/analytics" : `/admin/analytics?range=${r}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border hover:bg-secondary"
            }`}
          >
            {r === 365 ? "1 year" : `${r} days`}
          </Link>
        ))}
      </nav>

      {/* Headline KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={`Leads (${range}d)`}
          value={a.qualifiedTotal}
          hint="excludes spam"
        />
        <Kpi
          label="Last 7 days"
          value={a.last7}
          delta={a.weekOverWeekPct}
          hint={
            a.weekOverWeekPct === null
              ? "vs prior week"
              : `vs ${a.prev7} prior week`
          }
        />
        <Kpi
          label={`Signed (${range}d)`}
          value={a.signed}
          hint="retained clients"
        />
        <Kpi
          label="Conversion"
          value={`${a.conversionPct}%`}
          hint="signed ÷ real leads"
        />
      </div>

      {/* First-response speed — the #1 lever on intake conversion. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            First response time ({range}d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {response.sample === 0 ? (
            <p className="text-muted-foreground text-sm">
              {response.pending > 0
                ? `${response.pending} lead(s) awaiting a first response, and none answered yet in this window.`
                : `No responded leads in the last ${range} days yet.`}
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi
                  label="Median response"
                  value={formatMinutes(response.medianMinutes ?? 0)}
                  hint={`${response.sample} responded`}
                />
                <Kpi
                  label="Within 1 hour"
                  value={`${response.within1hPct ?? 0}%`}
                  hint="of responded leads"
                />
                <Kpi
                  label="Within 24 hours"
                  value={`${response.within24hPct ?? 0}%`}
                  hint="of responded leads"
                />
                <Kpi
                  label="Awaiting response"
                  value={response.pending}
                  hint="open, never touched"
                />
              </div>
              <p className="text-muted-foreground mt-3 text-xs">
                Measured from submission to the first staff action (status
                change, note, assignment, or conflict check).
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Daily leads (last {range} days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsChart data={a.daily} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel ({range}d)</CardTitle>
          </CardHeader>
          <CardContent>
            {a.total === 0 ? (
              <Empty>No leads in the last {range} days.</Empty>
            ) : (
              <ul className="grid gap-3">
                {STATUS_ORDER.map((status) => {
                  const count = a.byStatus[status];
                  const pct =
                    a.total > 0 ? Math.round((count / a.total) * 100) : 0;
                  return (
                    <li key={status} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">
                          {count}{" "}
                          <span className="text-muted-foreground text-xs">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="bg-secondary mt-1 h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="bg-primary h-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <RankCard title={`Lead source (${range}d)`} rows={a.bySource} />
        <RankCard title={`Practice area (${range}d)`} rows={a.byPracticeArea} />
        <RankCard title={`Top counties (${range}d)`} rows={a.byCounty} />
        <RankCard
          title={`Top landing pages (${range}d)`}
          rows={a.topLandingPages}
        />
      </div>

      {/* Website traffic — from PostHog pageviews (independent 7/30d windows). */}
      <h2 className="font-display mt-10 text-xl font-medium tracking-tight">
        Website traffic
      </h2>
      {!web.configured ? (
        <Card className="mt-4">
          <CardContent className="text-muted-foreground pt-6 text-sm">
            Connect PostHog to see traffic here — set{" "}
            <code className="bg-secondary rounded px-1 py-0.5 text-xs">
              POSTHOG_PERSONAL_API_KEY
            </code>{" "}
            and{" "}
            <code className="bg-secondary rounded px-1 py-0.5 text-xs">
              POSTHOG_PROJECT_ID
            </code>
            .
          </CardContent>
        </Card>
      ) : !web.hasData ? (
        <Card className="mt-4">
          <CardContent className="text-muted-foreground pt-6 text-sm">
            No pageviews recorded yet. Once the site is live and receiving
            visitors, traffic appears here.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Visitors (7d)" value={web.visitors7} hint="unique" />
            <Kpi label="Pageviews (7d)" value={web.pageviews7} />
            <Kpi label="Visitors (30d)" value={web.visitors30} hint="unique" />
            <Kpi label="Pageviews (30d)" value={web.pageviews30} />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Pageviews (last 14 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadsChart data={web.daily} />
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <RankCard title="Top pages (30d)" rows={web.topPages} />
            <RankCard title="Top referrers (30d)" rows={web.topReferrers} />
          </div>

          {/* Behavioral funnel — visit → form view → start → submit (30d). */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Visitor funnel (30d)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WebFunnel steps={web.funnel} />
              <p className="text-muted-foreground mt-4 text-xs">
                Unique people at each stage. {web.phoneClicks} phone-number
                click{web.phoneClicks === 1 ? "" : "s"} in the same window
                (an alternate conversion not shown in the bars).
              </p>
            </CardContent>
          </Card>

          {/* Live event feed — everything happening on the site. */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {web.recentEvents.length === 0 ? (
                <Empty>No recent events.</Empty>
              ) : (
                <ul className="divide-border divide-y text-sm">
                  {web.recentEvents.map((e, i) => (
                    <li
                      key={`${e.ts}-${i}`}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 flex-none rounded-full ${EVENT_DOT[e.event] ?? "bg-muted-foreground"}`}
                          aria-hidden
                        />
                        <span className="font-medium">
                          {EVENT_LABEL[e.event] ?? e.event}
                        </span>
                        {e.path ? (
                          <span className="text-muted-foreground min-w-0 truncate">
                            {e.path}
                          </span>
                        ) : null}
                      </span>
                      <time
                        className="text-muted-foreground flex-none text-xs"
                        dateTime={e.ts}
                      >
                        {formatEventTime(e.ts)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
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
  $pageview: "bg-muted-foreground/50",
  lead_form_viewed: "bg-primary/50",
  lead_form_started: "bg-primary",
  lead_submitted: "bg-success",
  phone_click: "bg-[var(--color-gold-500)]",
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

function WebFunnel({ steps }: { steps: { label: string; count: number }[] }) {
  const top = steps[0]?.count ?? 0;
  if (top === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No funnel data in the last 30 days yet.
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {steps.map((s, i) => {
        const pctOfTop = Math.round((s.count / top) * 100);
        const prev = i > 0 ? steps[i - 1].count : s.count;
        const stepPct = prev > 0 ? Math.round((s.count / prev) * 100) : 0;
        return (
          <li key={s.label} className="text-sm">
            <div className="flex items-center justify-between">
              <span>{s.label}</span>
              <span className="font-medium">
                {s.count}{" "}
                <span className="text-muted-foreground text-xs">
                  {i === 0 ? `(${pctOfTop}%)` : `(${stepPct}% of prior)`}
                </span>
              </span>
            </div>
            <div className="bg-secondary mt-1 h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full"
                style={{ width: `${pctOfTop}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Kpi({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-3xl font-medium tracking-tight">
            {value}
          </span>
          {delta !== undefined ? <Delta value={delta} /> : null}
        </div>
        {hint ? (
          <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
        <Minus className="h-3 w-3" aria-hidden />
        new
      </span>
    );
  }
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? "text-success" : "text-destructive"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(value)}%
    </span>
  );
}

function RankCard({ title, rows }: { title: string; rows: Ranked[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <Empty>No data yet.</Empty>
        ) : (
          <ul className="divide-border divide-y">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                {r.href ? (
                  <Link
                    href={r.href}
                    className="hover:text-primary min-w-0 truncate underline-offset-4 hover:underline"
                    title={`View ${r.label} leads`}
                  >
                    {r.label}
                  </Link>
                ) : (
                  <span className="min-w-0 truncate">{r.label}</span>
                )}
                <span className="flex-none font-medium">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>;
}
