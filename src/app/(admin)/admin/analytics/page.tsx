import LeadsChart, { type DailyPoint } from "@/components/admin/leads-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function AdminAnalyticsPage() {
  const supabase = await getServerSupabase();
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY_MS).toISOString();
  const since90 = new Date(now - 90 * DAY_MS).toISOString();

  const [{ data: byStatus }, { data: forChart }, { data: byCounty }] =
    await Promise.all([
      supabase.from("leads").select("status").gte("created_at", since30),
      supabase
        .from("leads")
        .select("created_at")
        .gte("created_at", since90),
      supabase
        .from("leads")
        .select("counties(name, slug)")
        .gte("created_at", since30)
        .not("county_id", "is", null),
    ]);

  const counts = (byStatus ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // Build a dense day-by-day series for the last 90 days. Filling zeros
  // gives a more honest visual than a sparse series.
  const series: DailyPoint[] = [];
  const start = startOfDay(now - 89 * DAY_MS);
  for (let i = 0; i < 90; i++) {
    const dayStart = start + i * DAY_MS;
    const iso = new Date(dayStart).toISOString().slice(0, 10);
    series.push({ date: iso, count: 0 });
  }
  for (const row of forChart ?? []) {
    const iso = (row.created_at as string).slice(0, 10);
    const point = series.find((p) => p.date === iso);
    if (point) point.count += 1;
  }

  // Per-county tally for the 30-day window. The Supabase select returns the
  // joined county object directly.
  const byCountyTally = new Map<string, number>();
  for (const row of (byCounty ?? []) as unknown as Array<{
    counties: { name: string } | null;
  }>) {
    const name = row.counties?.name;
    if (!name) continue;
    byCountyTally.set(name, (byCountyTally.get(name) ?? 0) + 1);
  }
  const countyRanked = [...byCountyTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Analytics
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lead activity from Postgres. Click any county or status filter on the
        leads page to drill in.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Daily leads (last 90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadsChart data={series} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funnel (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">
                No leads in the last 30 days.
              </p>
            ) : (
              <ul className="grid gap-3">
                {(
                  ["new", "contacted", "qualified", "signed", "rejected", "spam"] as const
                ).map((status) => {
                  const count = counts[status] ?? 0;
                  const pct =
                    total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <li key={status} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">
                          {count}{" "}
                          <span className="text-xs text-muted-foreground">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top counties (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {countyRanked.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No county-tagged leads yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {countyRanked.map(([name, count]) => (
                  <li
                    key={name}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>{name}</span>
                    <span className="font-medium">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
