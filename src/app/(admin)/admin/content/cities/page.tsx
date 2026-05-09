import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

type Row = {
  id: string;
  slug: string;
  name: string;
  is_published: boolean;
  is_priority: boolean;
  intro_md: string | null;
  local_stats_md: string | null;
  counties: { slug: string; name: string };
};

export default async function CitiesIndex() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      `id, slug, name, is_published, is_priority, intro_md, local_stats_md,
       counties!inner(slug, name)`,
    )
    .order("name");

  const rows = (data ?? []) as unknown as Row[];

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const county = r.counties.name;
    if (!grouped.has(county)) grouped.set(county, []);
    grouped.get(county)!.push(r);
  }

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <div className="mt-3 flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Cities
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any row to edit its intro and local-stats blocks. Tier-1
            (priority) cities get the most editorial attention.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No cities yet. Run the 0003_seed_geo.sql migration to seed the
            Tier-1 set.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6">
          {[...grouped.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([county, list]) => (
              <Card key={county}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {county}{" "}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({list.filter((c) => c.is_published).length} /{" "}
                      {list.length} published)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {list.map((r) => {
                      const hasContent =
                        Boolean(r.intro_md && r.intro_md.trim().length > 0) ||
                        Boolean(
                          r.local_stats_md &&
                            r.local_stats_md.trim().length > 0,
                        );
                      return (
                        <li key={r.id}>
                          <Link
                            href={`/admin/content/cities/${r.id}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/30"
                          >
                            <span className="flex items-center gap-2 truncate">
                              {r.is_priority ? (
                                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  Tier 1
                                </span>
                              ) : null}
                              <span className="truncate">{r.name}</span>
                            </span>
                            <span className="flex items-center gap-2 text-xs">
                              {hasContent ? (
                                <span className="text-muted-foreground">
                                  Has copy
                                </span>
                              ) : null}
                              <span
                                className={`rounded-md px-1.5 py-0.5 ${
                                  r.is_published
                                    ? "bg-success/10 text-success"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {r.is_published ? "Pub" : "Draft"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
