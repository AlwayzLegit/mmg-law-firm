import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

type Row = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  is_published: boolean;
  intro_md: string | null;
  local_stats_md: string | null;
};

export default async function CountiesIndex() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("counties")
    .select("id, slug, name, region, is_published, intro_md, local_stats_md")
    .order("name");

  const rows = (data ?? []) as Row[];

  // Group by region for legibility — there are 58 of these.
  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const region = r.region ?? "Other";
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region)!.push(r);
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
            Counties
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All 58 California counties. Click any row to edit its intro and
            local-stats blocks. Publish toggles per row.
          </p>
        </div>
      </div>

      {error ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6">
          {[...grouped.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([region, list]) => (
              <Card key={region}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {region}{" "}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({list.filter((r) => r.is_published).length} /{" "}
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
                            href={`/admin/content/counties/${r.id}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/30"
                          >
                            <span className="truncate">{r.name}</span>
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
