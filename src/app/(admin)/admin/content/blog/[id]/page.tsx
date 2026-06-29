import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import EditForm from "./edit-form";
import PublishControl from "./publish-control";
import DeleteButton from "./delete-button";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

export default async function BlogPostEditor({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, subtitle, body_md, excerpt, hero_image_url, tags, meta_description, is_published, published_at, created_at, updated_at, author_name",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const publicPath = `/blog/${data.slug}`;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const visiblePublicly =
    data.is_published &&
    (!data.published_at || new Date(data.published_at).getTime() <= now);
  const scheduled =
    data.is_published &&
    data.published_at != null &&
    new Date(data.published_at).getTime() > now;

  return (
    <div>
      <Link
        href="/admin/content/blog"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All posts
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
            {visiblePublicly ? (
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
            {" · "}by {data.author_name}
          </p>
        </div>
        <PublishStatusBadge
          isPublished={data.is_published}
          publishedAt={data.published_at}
          scheduled={scheduled}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={data.id}
          title={data.title}
          slug={data.slug}
          subtitle={data.subtitle ?? ""}
          body_md={data.body_md ?? ""}
          excerpt={data.excerpt ?? ""}
          hero_image_url={data.hero_image_url ?? ""}
          meta_description={data.meta_description ?? ""}
          tags={data.tags.join(", ")}
          published_at={data.published_at ?? ""}
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
                publishedAt={data.published_at}
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
              <Pair
                label="Tags"
                value={data.tags.length > 0 ? data.tags.join(", ") : "—"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteButton id={data.id} title={data.title} />
              <p className="mt-2 text-xs text-muted-foreground">
                Delete is permitted only for unpublished posts — keeps the
                public URL from breaking abruptly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PublishStatusBadge({
  isPublished,
  publishedAt,
  scheduled,
}: {
  isPublished: boolean;
  publishedAt: string | null;
  scheduled: boolean;
}) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        scheduled
          ? "bg-warning/10 text-warning"
          : isPublished
            ? "bg-success/10 text-success"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      {scheduled && publishedAt
        ? `Scheduled — ${new Date(publishedAt).toLocaleDateString("en-US")}`
        : isPublished
          ? "Published"
          : "Draft"}
    </span>
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
