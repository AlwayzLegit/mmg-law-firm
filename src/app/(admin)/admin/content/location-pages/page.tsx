import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import CreateRow from "./create-row";
import LocationPagesTable from "./location-pages-table";

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
  const [pagesResult, citiesResult, practicesResult] = await Promise.all([
    supabase
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
      .order("last_reviewed_at", { ascending: true, nullsFirst: true }),
    supabase
      .from("cities")
      .select("id, name, counties!inner(name)")
      .order("name"),
    supabase
      .from("practice_areas")
      .select("id, name, display_order")
      .order("display_order"),
  ]);

  const { data, error } = pagesResult;
  const rows = (data ?? []) as unknown as Row[];

  type CityOption = { id: string; name: string; counties: { name: string } };
  const cityOptions = ((citiesResult.data ?? []) as unknown as CityOption[]).map(
    (c) => ({ id: c.id, label: `${c.counties.name} · ${c.name}` }),
  );
  const practiceOptions = (practicesResult.data ?? []).map((p) => ({
    id: p.id,
    label: p.name,
  }));

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const stale = (r: Row) => {
    if (!r.last_reviewed_at) return r.is_published;
    return (
      r.is_published &&
      now - new Date(r.last_reviewed_at).getTime() > STALE_AFTER_DAYS * DAY_MS
    );
  };

  const tableRows = rows.map((r) => ({
    id: r.id,
    href: `/admin/content/location-pages/${r.id}`,
    title: `${r.cities.name} · ${r.practice_areas.name}`,
    path: `/${r.cities.counties.slug}/${r.cities.slug}/${r.practice_areas.slug}`,
    hasAngle: Boolean(r.local_angle_md && r.local_angle_md.trim().length > 0),
    isPublished: r.is_published,
    lastReviewed: r.last_reviewed_at,
    isStale: stale(r),
  }));

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            City × practice pages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per spec §17 #1, each row needs a unique <code className="rounded bg-secondary px-1 py-0.5 text-xs">local_angle_md</code> to publish, and per §10.4 must be reviewed every 12 months.
          </p>
        </div>
        <CreateRow cities={cityOptions} practiceAreas={practiceOptions} />
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
            <p className="text-sm text-muted-foreground">
              No city × practice page rows yet. Click{" "}
              <strong className="text-foreground">New page</strong> above to
              create your first draft.
            </p>
          ) : (
            <LocationPagesTable rows={tableRows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
