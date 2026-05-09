import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

const STALE_AFTER_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = {
  id: string;
  is_published: boolean;
  local_angle_md: string | null;
  last_reviewed_at: string | null;
  cities: {
    slug: string;
    name: string;
    counties: { slug: string; name: string };
  };
  practice_areas: { slug: string; name: string };
};

export default async function LocationPagesIndex() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("location_pages")
    .select(
      `
        id,
        is_published,
        local_angle_md,
        last_reviewed_at,
        cities!inner(slug, name, counties!inner(slug, name)),
        practice_areas!inner(slug, name)
      `,
    )
    .order("last_reviewed_at", { ascending: true, nullsFirst: true });

  const rows = (data ?? []) as unknown as Row[];

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const stale = (r: Row) => {
    if (!r.last_reviewed_at) return r.is_published;
    return (
      r.is_published &&
      now - new Date(r.last_reviewed_at).getTime() > STALE_AFTER_DAYS * DAY_MS
    );
  };

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
            City × practice pages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per spec §17 #1, each row needs a unique <code className="rounded bg-secondary px-1 py-0.5 text-xs">local_angle_md</code> to publish, and per §10.4 must be reviewed every 12 months.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "row" : "rows"} ·{" "}
            {rows.filter((r) => r.is_published).length} published
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : rows.length === 0 ? (
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p>
                No city × practice page rows yet. Create one in Supabase
                Studio (table: <code className="rounded bg-secondary px-1 py-0.5 text-xs">location_pages</code>) by inserting a row with the <code className="rounded bg-secondary px-1 py-0.5 text-xs">city_id</code> and <code className="rounded bg-secondary px-1 py-0.5 text-xs">practice_area_id</code> you want to write for. Then come back here to fill in the editorial copy.
              </p>
              <p>
                {/* TODO(human): inline create-row flow. Pick city + practice
                    area dropdowns and create the row from this screen. */}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-3 text-left">Page</th>
                    <th className="px-2 py-3 text-left">Local angle</th>
                    <th className="px-2 py-3 text-left">Status</th>
                    <th className="px-2 py-3 text-left">Last reviewed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const hasAngle = Boolean(
                      r.local_angle_md && r.local_angle_md.trim().length > 0,
                    );
                    const isStale = stale(r);
                    return (
                      <tr key={r.id} className="border-b border-border/60">
                        <td className="px-2 py-3 align-top">
                          <Link
                            href={`/admin/content/location-pages/${r.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {r.cities.name} · {r.practice_areas.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            /{r.cities.counties.slug}/{r.cities.slug}/
                            {r.practice_areas.slug}
                          </p>
                        </td>
                        <td className="px-2 py-3 align-top">
                          {hasAngle ? (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                              Set
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-warning">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                              Empty
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3 align-top">
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                              r.is_published
                                ? "bg-success/10 text-success"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {r.is_published ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-top text-xs">
                          {r.last_reviewed_at ? (
                            <span
                              className={isStale ? "text-warning" : "text-muted-foreground"}
                            >
                              {isStale ? (
                                <AlertTriangle
                                  className="mr-1 inline h-3 w-3"
                                  aria-hidden
                                />
                              ) : null}
                              {new Date(r.last_reviewed_at).toLocaleDateString(
                                "en-US",
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
