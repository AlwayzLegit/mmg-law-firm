import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import EditForm from "./edit-form";
import PublishToggle from "./publish-toggle";

type Props = { params: Promise<{ id: string }> };

type Row = {
  id: string;
  slug: string;
  name: string;
  population: number | null;
  is_priority: boolean;
  is_published: boolean;
  intro_md: string | null;
  local_stats_md: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  counties: { slug: string; name: string };
};

export default async function CityEditorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("cities")
    .select(
      `id, slug, name, population, is_priority, is_published, intro_md,
       local_stats_md, meta_description, created_at, updated_at,
       counties!inner(slug, name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const row = data as unknown as Row;
  const publicPath = `/locations/${row.counties.slug}/${row.slug}`;

  return (
    <div>
      <Link
        href="/admin/content/cities"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All cities
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-medium tracking-tight">
              {row.name}
            </h1>
            {row.is_priority ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                Tier 1
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.counties.name}
            {row.population
              ? ` · pop ${row.population.toLocaleString()}`
              : ""}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              {publicPath}
            </code>
            {row.is_published ? (
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
          local_stats_md={row.local_stats_md ?? ""}
          meta_description={row.meta_description ?? ""}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishToggle id={row.id} isPublished={row.is_published} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Pair label="Created" value={new Date(row.created_at).toLocaleString("en-US")} />
              <Pair label="Updated" value={new Date(row.updated_at).toLocaleString("en-US")} />
              <Pair label="Slug" value={row.slug} />
              <Pair
                label="Tier"
                value={row.is_priority ? "Priority (Tier 1)" : "Standard"}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-baseline gap-2">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}
