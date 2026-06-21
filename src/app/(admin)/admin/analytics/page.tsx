import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import LeadsChart from "@/components/admin/leads-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  getLeadAnalytics,
  STATUS_ORDER,
  type Ranked,
} from "@/lib/data/lead-analytics";

export default async function AdminAnalyticsPage() {
  const supabase = await getServerSupabase();
  const a = await getLeadAnalytics(supabase, 90);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Analytics
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Lead activity from Postgres over the last 90 days. Conversion excludes
        spam. Click any county or status on the leads page to drill in.
      </p>

      {/* Headline KPIs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Leads (90d)"
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
        <Kpi label="Signed (90d)" value={a.signed} hint="retained clients" />
        <Kpi
          label="Conversion"
          value={`${a.conversionPct}%`}
          hint="signed ÷ real leads"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Daily leads (last 90 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsChart data={a.daily} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel (90d)</CardTitle>
          </CardHeader>
          <CardContent>
            {a.total === 0 ? (
              <Empty>No leads in the last 90 days.</Empty>
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

        <RankCard title="Lead source (90d)" rows={a.bySource} />
        <RankCard title="Practice area (90d)" rows={a.byPracticeArea} />
        <RankCard title="Top counties (90d)" rows={a.byCounty} />
        <RankCard title="Top landing pages (90d)" rows={a.topLandingPages} />
      </div>
    </div>
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
