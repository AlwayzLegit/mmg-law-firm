import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import ContentHistory from "@/components/admin/content-history";

import EditForm from "./edit-form";
import PublishToggle from "./publish-toggle";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

export default async function CountyEditorPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("counties")
    .select(
      "id, slug, name, short_name, region, seat, fips, is_published, intro_md, local_stats_md, meta_description, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const publicPath = `/locations/${data.slug}`;

  return (
    <div>
      <Link
        href="/admin/content/counties"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All counties
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {data.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.region ? `${data.region} · ` : ""}
            County seat: {data.seat ?? "—"} · FIPS {data.fips ?? "—"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <code className="rounded bg-secondary px-1 py-0.5 text-xs">
              {publicPath}
            </code>
            {data.is_published ? (
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
            data.is_published
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {data.is_published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={data.id}
          intro_md={data.intro_md ?? ""}
          local_stats_md={data.local_stats_md ?? ""}
          meta_description={data.meta_description ?? ""}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishToggle
                id={data.id}
                isPublished={data.is_published}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Pair label="Created" value={new Date(data.created_at).toLocaleString("en-US")} />
              <Pair label="Updated" value={new Date(data.updated_at).toLocaleString("en-US")} />
              <Pair label="Slug" value={data.slug} />
              <Pair label="Short name" value={data.short_name} />
            </CardContent>
          </Card>

          <ContentHistory entity="counties" entityId={data.id} />
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
