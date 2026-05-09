import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminAnalyticsPage() {
  const supabase = await getServerSupabase();
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: byStatus } = await supabase
    .from("leads")
    .select("status")
    .gte("created_at", since30);

  const counts = (byStatus ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Analytics
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Last 30 days from Postgres. Group E will add chart-rendered timeseries.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Lead funnel (30d)</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads in the last 30 days.
            </p>
          ) : (
            <ul className="grid gap-3">
              {(["new", "contacted", "qualified", "signed", "rejected", "spam"] as const).map(
                (status) => {
                  const count = counts[status] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
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
                },
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* TODO(group-e): timeseries chart with recharts; per-county and
          per-source breakdowns. */}
    </div>
  );
}
