import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ContentPagesAdmin() {
  const supabase = await getServerSupabase();
  const [counties, cities, locationPages, practiceAreas] = await Promise.all([
    supabase
      .from("counties")
      .select("id, slug, name, is_published")
      .order("name"),
    supabase
      .from("cities")
      .select("id, slug, name, is_published, is_priority, county_id")
      .order("name"),
    supabase
      .from("location_pages")
      .select("id, city_id, practice_area_id, is_published, last_reviewed_at"),
    supabase
      .from("practice_areas")
      .select("id, slug, name, is_published, display_order")
      .order("display_order"),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Content
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Counties, cities, city × practice landing pages, and practice areas.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RowSummary
          title="Counties"
          published={counties.data?.filter((c) => c.is_published).length ?? 0}
          total={counties.data?.length ?? 0}
        />
        <RowSummary
          title="Cities"
          published={cities.data?.filter((c) => c.is_published).length ?? 0}
          total={cities.data?.length ?? 0}
        />
        <RowSummary
          title="City × practice pages"
          published={
            locationPages.data?.filter((p) => p.is_published).length ?? 0
          }
          total={locationPages.data?.length ?? 0}
        />
        <RowSummary
          title="Practice areas"
          published={
            practiceAreas.data?.filter((p) => p.is_published).length ?? 0
          }
          total={practiceAreas.data?.length ?? 0}
        />
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Editor coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {/* TODO(group-e): full inline editor with markdown preview, publish
              toggle, last-reviewed-at warning when older than 12 months. For
              now, edits go through the Supabase SQL editor or table editor. */}
          The inline page editor is on the roadmap. Until it lands, edit rows
          directly via the Supabase Studio table editor and toggle{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs">
            is_published
          </code>{" "}
          there. City × practice pages additionally require non-empty{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs">
            local_angle_md
          </code>{" "}
          to render publicly (RLS enforces this).
        </CardContent>
      </Card>
    </div>
  );
}

function RowSummary({
  title,
  published,
  total,
}: {
  title: string;
  published: number;
  total: number;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <p className="mt-2 font-display text-3xl font-medium tracking-tight">
          {published}
          <span className="ml-1 text-base text-muted-foreground">
            / {total} published
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
