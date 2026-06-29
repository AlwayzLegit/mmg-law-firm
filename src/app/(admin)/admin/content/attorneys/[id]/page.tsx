import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import EditForm from "./edit-form";
import PublishControl from "./publish-control";
import DeleteButton from "./delete-button";
import HeadshotUpload from "./headshot-upload";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

const SELECT_COLS = `id, slug, full_name, display_name, job_title, bar_state, bar_number, bar_admission_date, headshot_url, headshot_alt, short_bio, bio_md, law_school, law_school_year, undergrad_school, undergrad_degree, undergrad_year, federal_court_admissions, bar_associations, honors_md, languages, avvo_url, justia_url, linkedin_url, super_lawyers_url, display_order, is_published, created_at, updated_at` as const;

export default async function AttorneyProfileEditor({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("attorney_profiles")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const publicPath = `/attorneys/${data.slug}`;

  return (
    <div>
      <Link
        href="/admin/content/attorneys"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All attorneys
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {data.full_name}
          </h1>
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
                  className="text-primary underline-offset-4 hover:underline"
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
          slug={data.slug}
          full_name={data.full_name}
          display_name={data.display_name ?? ""}
          job_title={data.job_title ?? ""}
          bar_state={data.bar_state}
          bar_number={data.bar_number}
          bar_admission_date={data.bar_admission_date ?? ""}
          headshot_url={data.headshot_url ?? ""}
          headshot_alt={data.headshot_alt ?? ""}
          short_bio={data.short_bio ?? ""}
          bio_md={data.bio_md ?? ""}
          law_school={data.law_school ?? ""}
          law_school_year={data.law_school_year?.toString() ?? ""}
          undergrad_school={data.undergrad_school ?? ""}
          undergrad_degree={data.undergrad_degree ?? ""}
          undergrad_year={data.undergrad_year?.toString() ?? ""}
          federal_court_admissions={(
            data.federal_court_admissions ?? []
          ).join("\n")}
          bar_associations={(data.bar_associations ?? []).join("\n")}
          honors_md={data.honors_md ?? ""}
          languages={(data.languages ?? []).join(", ")}
          avvo_url={data.avvo_url ?? ""}
          justia_url={data.justia_url ?? ""}
          linkedin_url={data.linkedin_url ?? ""}
          super_lawyers_url={data.super_lawyers_url ?? ""}
          display_order={data.display_order?.toString() ?? "100"}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishControl
                id={data.id}
                isPublished={data.is_published}
                hasBarNumber={Boolean(data.bar_number?.trim())}
                hasBio={Boolean(data.bio_md?.trim())}
                hasHeadshot={Boolean(data.headshot_url?.trim())}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Headshot</CardTitle>
            </CardHeader>
            <CardContent>
              <HeadshotUpload
                id={data.id}
                currentUrl={data.headshot_url ?? null}
                alt={data.headshot_alt ?? data.full_name}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Pair
                label="Created"
                value={new Date(data.created_at).toLocaleString("en-US")}
              />
              <Pair
                label="Updated"
                value={new Date(data.updated_at).toLocaleString("en-US")}
              />
              <Pair label="Display order" value={String(data.display_order)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteButton id={data.id} name={data.full_name} />
              <p className="mt-2 text-xs text-muted-foreground">
                Delete is permitted only for unpublished profiles — keeps the
                public bio URL from breaking abruptly.
              </p>
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
      <span className="break-words">{value}</span>
    </div>
  );
}
