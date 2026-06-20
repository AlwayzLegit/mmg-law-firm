import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await getServerSupabase();

  // Lightweight queries — admin role bypasses public-only RLS via the
  // is_admin() policy on leads.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: leads24h },
    { count: leads7d },
    signed30,
    total30,
    { count: dueCount },
    recent,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since7d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "signed")
      .gte("created_at", since30d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since30d),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", new Date(now).toISOString())
      .not("status", "in", "(signed,rejected,spam)"),
    supabase
      .from("leads")
      .select("id, full_name, phone, county_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const conversion =
    total30.count && total30.count > 0
      ? Math.round(((signed30.count ?? 0) / total30.count) * 100)
      : null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Dashboard
        </h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads (24h)" value={leads24h ?? 0} />
        <StatCard label="New leads (7d)" value={leads7d ?? 0} />
        <StatCard
          label="Signed (30d)"
          value={signed30.count ?? 0}
          sub={total30.count ? `${total30.count} total` : null}
        />
        <StatCard
          label="Conversion (30d)"
          value={conversion === null ? "—" : `${conversion}%`}
        />
      </div>

      {dueCount && dueCount > 0 ? (
        <Link
          href="/admin/leads?due=1"
          className="border-primary/30 bg-primary/5 hover:bg-primary/10 mt-6 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm transition-colors"
        >
          <span className="text-primary font-medium">
            {dueCount} follow-up{dueCount === 1 ? "" : "s"} due
          </span>
          <span className="text-muted-foreground text-xs">Review now →</span>
        </Link>
      ) : null}

      <Card className="mt-10">
        <CardHeader>
          <CardTitle>Recent leads</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.error ? (
            <p className="text-destructive text-sm">
              Couldn&apos;t load leads: {recent.error.message}
            </p>
          ) : !recent.data || recent.data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No leads yet — once submissions come in via the public form
              they&apos;ll appear here.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {recent.data.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="hover:text-primary font-medium"
                    >
                      {l.full_name}
                    </Link>
                    <p className="text-muted-foreground truncate text-xs">
                      {l.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-secondary rounded-md px-2 py-0.5 capitalize">
                      {l.status}
                    </span>
                    <time
                      dateTime={l.created_at}
                      className="text-muted-foreground"
                    >
                      {new Date(l.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string | null;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          {label}
        </p>
        <p className="font-display mt-2 text-3xl font-medium tracking-tight">
          {value}
        </p>
        {sub ? (
          <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
