import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import ContentHistory from "@/components/admin/content-history";

import EditForm from "./edit-form";
import PublishControl from "./publish-control";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  intro_md: string | null;
  local_angle_md: string | null;
  meta_description: string | null;
  is_published: boolean;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  cities: {
    slug: string;
    name: string;
    counties: { slug: string; name: string };
  };
  practice_areas: { slug: string; name: string };
};

export default async function LocationPageDetail({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("location_pages")
    .select(
      `
        id,
        intro_md,
        local_angle_md,
        meta_description,
        is_published,
        last_reviewed_at,
        created_at,
        updated_at,
        cities!inner(slug, name, counties!inner(slug, name)),
        practice_areas!inner(slug, name)
      `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const row = data as unknown as Row;
  const publicPath = `/locations/${row.cities.counties.slug}/${row.cities.slug}/${row.practice_areas.slug}`;
  const hasAngle = Boolean(
    row.local_angle_md && row.local_angle_md.trim().length > 0,
  );

  return (
    <div>
      <Link
        href="/admin/content/location-pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All city × practice pages
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {row.cities.name} · {row.practice_areas.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              {publicPath}
            </code>
            {row.is_published && hasAngle ? (
              <>
                {" · "}
                <Link
                  href={publicPath}
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline underline-offset-4"
                >
                  Open public page ↗
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            row.is_published
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {row.is_published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={row.id}
          intro_md={row.intro_md ?? ""}
          local_angle_md={row.local_angle_md ?? ""}
          meta_description={row.meta_description ?? ""}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishControl
                id={row.id}
                isPublished={row.is_published}
                hasAngle={hasAngle}
                lastReviewedAt={row.last_reviewed_at}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Row
                label="Created"
                value={new Date(row.created_at).toLocaleString("en-US")}
              />
              <Row
                label="Updated"
                value={new Date(row.updated_at).toLocaleString("en-US")}
              />
              <Row
                label="Last reviewed"
                value={
                  row.last_reviewed_at
                    ? new Date(row.last_reviewed_at).toLocaleString("en-US")
                    : "Never"
                }
              />
            </CardContent>
          </Card>

          <ContentHistory entity="location_pages" entityId={row.id} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
