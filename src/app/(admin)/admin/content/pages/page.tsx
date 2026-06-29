import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import BulkReviewButton from "./bulk-review-button";
import ReviewRowButton from "./review-row-button";
import { requireAdmin } from "@/lib/auth/require-admin";

const STALE_AFTER_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ContentPagesAdmin() {
  await requireAdmin();
  const supabase = await getServerSupabase();
  const [counties, cities, locationPages, practiceAreas, attorneys, legal] =
    await Promise.all([
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
        .select(
          `
            id,
            is_published,
            last_reviewed_at,
            local_angle_md,
            cities!inner(slug, name, counties!inner(slug, name)),
            practice_areas!inner(slug, name)
          `,
        )
        .order("last_reviewed_at", { ascending: true, nullsFirst: true }),
      supabase
        .from("practice_areas")
        .select("id, slug, name, is_published, display_order")
        .order("display_order"),
      supabase
        .from("attorney_profiles")
        .select("id, slug, full_name, is_published")
        .order("display_order"),
      supabase
        .from("legal_pages")
        .select("id, slug, title, is_published")
        .order("display_order"),
    ]);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const staleThreshold = now - STALE_AFTER_DAYS * DAY_MS;

  type LocationPageRow = {
    id: string;
    is_published: boolean;
    last_reviewed_at: string | null;
    local_angle_md: string | null;
    cities: {
      slug: string;
      name: string;
      counties: { slug: string; name: string };
    };
    practice_areas: { slug: string; name: string };
  };

  const lpRows = (locationPages.data ?? []) as unknown as LocationPageRow[];

  const stalePages = lpRows.filter((p) => {
    if (!p.is_published) return false;
    if (!p.last_reviewed_at) return true;
    return new Date(p.last_reviewed_at).getTime() < staleThreshold;
  });

  const missingAngle = lpRows.filter(
    (p) =>
      p.is_published && (!p.local_angle_md || p.local_angle_md.trim() === ""),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Content
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Counties, cities, city × practice landing pages, and practice areas.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RowSummary
          title="Counties"
          published={counties.data?.filter((c) => c.is_published).length ?? 0}
          total={counties.data?.length ?? 0}
          href="/admin/content/counties"
        />
        <RowSummary
          title="Cities"
          published={cities.data?.filter((c) => c.is_published).length ?? 0}
          total={cities.data?.length ?? 0}
          href="/admin/content/cities"
        />
        <RowSummary
          title="City x practice pages"
          published={lpRows.filter((p) => p.is_published).length}
          total={lpRows.length}
          href="/admin/content/location-pages"
        />
        <RowSummary
          title="Practice areas"
          published={
            practiceAreas.data?.filter((p) => p.is_published).length ?? 0
          }
          total={practiceAreas.data?.length ?? 0}
          href="/admin/content/practice-areas"
        />
        <RowSummary
          title="Attorneys"
          published={attorneys.data?.filter((a) => a.is_published).length ?? 0}
          total={attorneys.data?.length ?? 0}
          href="/admin/content/attorneys"
        />
        <RowSummary
          title="Legal pages"
          published={legal.data?.filter((p) => p.is_published).length ?? 0}
          total={legal.data?.length ?? 0}
          href="/admin/content/legal"
        />
      </div>

      <div className="mt-6">
        <Link
          href="/admin/content/redirects"
          className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm font-medium"
        >
          Manage URL redirects →
        </Link>
      </div>

      {(stalePages.length > 0 || missingAngle.length > 0) && (
        <Card className="border-warning/40 bg-warning/5 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="text-warning h-4 w-4" aria-hidden />
              Pages needing attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {missingAngle.length > 0 ? (
              <div>
                <p className="font-medium">
                  {missingAngle.length} published page
                  {missingAngle.length === 1 ? "" : "s"} with empty
                  local_angle_md
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Per CRPC compliance, city x practice pages must have unique
                  locally-relevant content. RLS already hides these publicly,
                  but they should be unpublished or filled in.
                </p>
                <ul className="mt-2 grid gap-1">
                  {missingAngle.slice(0, 10).map((p) => (
                    <PageRow key={p.id} row={p} />
                  ))}
                </ul>
              </div>
            ) : null}

            {stalePages.length > 0 ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {stalePages.length} published page
                    {stalePages.length === 1 ? "" : "s"} not reviewed in 12+
                    months
                  </p>
                  <BulkReviewButton ids={stalePages.map((p) => p.id)} />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Spec §10.4: pages must be reviewed within 12 months to remain
                  published. Open each row, confirm the content is current, and
                  update last_reviewed_at.
                </p>
                <ul className="mt-2 grid gap-1">
                  {stalePages.slice(0, 10).map((p) => (
                    <PageRow key={p.id} row={p} showReview />
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Editing pages</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Click any city × practice row above (or open{" "}
          <Link
            href="/admin/content/location-pages"
            className="text-primary underline-offset-4 hover:underline"
          >
            all city × practice pages
          </Link>
          ) to edit its local angle, intro, and meta — with live Markdown
          preview — and to publish it. A page needs a non-empty{" "}
          <code className="bg-secondary rounded px-1 py-0.5 text-xs">
            local_angle_md
          </code>{" "}
          before it can be published (RLS enforces this on the public site too).
          Counties, cities, practice areas, attorneys, and legal pages each have
          their own editors linked above.
        </CardContent>
      </Card>
    </div>
  );
}

function PageRow({
  row,
  showReview = false,
}: {
  row: {
    id: string;
    cities: {
      slug: string;
      name: string;
      counties: { slug: string; name: string };
    };
    practice_areas: { slug: string; name: string };
    last_reviewed_at: string | null;
  };
  showReview?: boolean;
}) {
  return (
    <li className="border-border bg-card flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
      <Link
        href={`/admin/content/location-pages/${row.id}`}
        className="hover:text-primary truncate font-medium"
      >
        {row.cities.name} · {row.practice_areas.name}
      </Link>
      <span className="flex flex-none items-center gap-3">
        <span className="text-muted-foreground">
          {row.last_reviewed_at
            ? `Reviewed ${new Date(row.last_reviewed_at).toLocaleDateString("en-US")}`
            : "Never reviewed"}
        </span>
        {showReview ? <ReviewRowButton id={row.id} /> : null}
      </span>
    </li>
  );
}

function RowSummary({
  title,
  published,
  total,
  href,
}: {
  title: string;
  published: number;
  total: number;
  href?: string;
}) {
  const body = (
    <CardContent className="pt-6">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
        {title}
      </p>
      <p className="font-display mt-2 text-3xl font-medium tracking-tight">
        {published}
        <span className="text-muted-foreground ml-1 text-base">
          / {total} published
        </span>
      </p>
      {href ? <p className="text-primary mt-3 text-xs">Manage →</p> : null}
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="hover:border-primary/30 transition-colors">
          {body}
        </Card>
      </Link>
    );
  }
  return <Card>{body}</Card>;
}
