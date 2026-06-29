import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  isLegalPageSlug,
  LEGAL_PAGE_FALLBACKS,
} from "@/lib/data/legal-pages";

import EditForm from "./edit-form";
import PublishControl from "./publish-control";
import ReviewButton from "./review-button";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

const SELECT_COLS = `id, slug, title, subtitle, body_md, meta_description, effective_date, last_reviewed_at, is_published, display_order, created_at, updated_at` as const;

export default async function LegalPageEditor({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("legal_pages")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const fallback = isLegalPageSlug(data.slug)
    ? LEGAL_PAGE_FALLBACKS[data.slug]
    : null;

  const publicPath = `/legal/${data.slug}`;
  const reviewedAt = data.last_reviewed_at
    ? new Date(data.last_reviewed_at)
    : null;
  const reviewedDisplay = reviewedAt
    ? reviewedAt.toLocaleString("en-US")
    : "Never";

  return (
    <div>
      <Link
        href="/admin/content/legal"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All legal pages
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {data.title}
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
          title={data.title}
          subtitle={data.subtitle ?? ""}
          body_md={data.body_md ?? ""}
          meta_description={data.meta_description ?? ""}
          effective_date={
            data.effective_date ? data.effective_date.slice(0, 10) : ""
          }
          fallbackBody={fallback?.body_md ?? ""}
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
                hasBody={Boolean(data.body_md?.trim())}
                lastReviewedAt={data.last_reviewed_at}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-xs text-muted-foreground">
                Spec §10.4: legal pages must be reviewed within 12 months.
                Last reviewed:{" "}
                <span className="text-foreground">{reviewedDisplay}</span>
              </p>
              <ReviewButton id={data.id} />
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
              <Pair
                label="Effective"
                value={
                  data.effective_date
                    ? new Date(data.effective_date).toLocaleDateString("en-US")
                    : "—"
                }
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
      <span className="break-words">{value}</span>
    </div>
  );
}
