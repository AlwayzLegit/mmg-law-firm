import Link from "next/link";

import { AdminPageHeader, EmptyNote, Panel, adminCode } from "@/components/admin/ui";
import { getServerSupabase } from "@/lib/supabase/server";

import CreateRow from "./create-row";
import LocationPagesTable from "./location-pages-table";
import { requireAdmin } from "@/lib/auth/require-admin";

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

export default async function LocationPagesIndex({
  searchParams,
}: {
  searchParams: Promise<{ needs?: string }>;
}) {
  await requireAdmin();
  const { needs } = await searchParams;
  const needsAngle = needs === "angle";
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
  const cityOptions = (
    (citiesResult.data ?? []) as unknown as CityOption[]
  ).map((c) => ({ id: c.id, label: `${c.counties.name} · ${c.name}` }));
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

  const allTableRows = rows.map((r) => ({
    id: r.id,
    href: `/admin/content/location-pages/${r.id}`,
    title: `${r.cities.name} · ${r.practice_areas.name}`,
    path: `/${r.cities.counties.slug}/${r.cities.slug}/${r.practice_areas.slug}`,
    hasAngle: Boolean(r.local_angle_md && r.local_angle_md.trim().length > 0),
    isPublished: r.is_published,
    lastReviewed: r.last_reviewed_at,
    isStale: stale(r),
  }));

  // ?needs=angle drills in on drafts that still need a local angle written
  // (linked from the dashboard "Needs attention" panel).
  const tableRows = needsAngle
    ? allTableRows.filter((r) => !r.hasAngle)
    : allTableRows;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="City × practice pages"
        description={
          <>
            Per spec §17 #1, each row needs a unique <code className={adminCode}>local_angle_md</code> to publish, and per §10.4
            must be reviewed every 12 months.
          </>
        }
        actions={<CreateRow cities={cityOptions} practiceAreas={practiceOptions} />}
      />

      {needsAngle ? (
        <div className="mt-4 flex items-center gap-2">
          <span className="bg-gold/18 text-gold-deep inline-flex h-[34px] items-center gap-2 rounded-full px-3 text-xs font-semibold">
            Drafts needing a local angle
            <Link
              href="/admin/content/location-pages"
              aria-label="Clear filter"
              className="text-gold-deep hover:text-foreground no-underline"
            >
              ✕
            </Link>
          </span>
        </div>
      ) : null}

      <Panel
        className="mt-6"
        title={`${tableRows.length} ${tableRows.length === 1 ? "row" : "rows"}`}
        action={
          <span className="text-stone text-xs">
            {needsAngle ? "need a local angle" : `${rows.filter((r) => r.is_published).length} published`}
          </span>
        }
      >
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : rows.length === 0 ? (
          <EmptyNote>
            No city × practice page rows yet. Click <strong className="text-foreground">New page</strong> above to create your
            first draft.
          </EmptyNote>
        ) : (
          <LocationPagesTable rows={tableRows} />
        )}
      </Panel>
    </div>
  );
}
