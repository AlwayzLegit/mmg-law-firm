import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import NewPostForm from "./new-post-form";

export default async function ContentBlogAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, is_published, published_at, updated_at, tags",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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
            Blog
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click any row to edit. Posts with a future <code className="rounded bg-secondary px-1 py-0.5 text-xs">published_at</code> stay hidden until that time.
          </p>
        </div>
        <NewPostForm />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Posts ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No posts yet. Click <strong className="text-foreground">New post</strong> to draft your first one.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((p) => {
                const scheduled =
                  p.is_published &&
                  p.published_at &&
                  new Date(p.published_at).getTime() > now;
                return (
                  <li key={p.id} className="py-3">
                    <Link
                      href={`/admin/content/blog/${p.id}`}
                      className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /blog/{p.slug}
                          {p.tags.length > 0
                            ? ` · ${p.tags.slice(0, 3).join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2 text-xs">
                        {scheduled ? (
                          <span className="rounded-md bg-warning/10 px-2 py-0.5 font-medium text-warning">
                            Scheduled
                          </span>
                        ) : (
                          <span
                            className={`rounded-md px-2 py-0.5 font-medium ${
                              p.is_published
                                ? "bg-success/10 text-success"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {p.is_published ? "Published" : "Draft"}
                          </span>
                        )}
                        <time
                          dateTime={p.updated_at}
                          className="text-muted-foreground"
                        >
                          {new Date(p.updated_at).toLocaleDateString("en-US")}
                        </time>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
