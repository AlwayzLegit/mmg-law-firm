import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import NewPostForm from "./new-post-form";

const PAGE_SIZE = 50;

export default async function ContentBlogAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getServerSupabase();
  const { data, error, count } = await supabase
    .from("blog_posts")
    .select("id, slug, title, is_published, published_at, updated_at, tags", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const now = Date.now();

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-muted-foreground hover:text-primary text-sm"
      >
        ← Content
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Blog
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Click any row to edit. Posts with a future{" "}
            <code className="bg-secondary rounded px-1 py-0.5 text-xs">
              published_at
            </code>{" "}
            stay hidden until that time.
          </p>
        </div>
        <NewPostForm />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Posts ({total})
            {totalPages > 1 ? (
              <span className="text-muted-foreground ml-2 text-xs font-normal">
                · page {page} of {totalPages}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No posts yet. Click{" "}
              <strong className="text-foreground">New post</strong> to draft
              your first one.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {data.map((p) => {
                const scheduled =
                  p.is_published &&
                  p.published_at &&
                  new Date(p.published_at).getTime() > now;
                return (
                  <li key={p.id} className="py-3">
                    <Link
                      href={`/admin/content/blog/${p.id}`}
                      className="hover:text-primary flex items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          /blog/{p.slug}
                          {p.tags.length > 0
                            ? ` · ${p.tags.slice(0, 3).join(", ")}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2 text-xs">
                        {scheduled ? (
                          <span className="bg-warning/10 text-warning rounded-md px-2 py-0.5 font-medium">
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

          {totalPages > 1 ? (
            <nav
              className="border-border mt-6 flex items-center justify-between gap-3 border-t pt-4"
              aria-label="Pagination"
            >
              {page > 1 ? (
                <Link
                  href={`/admin/content/blog?page=${page - 1}`}
                  rel="prev"
                  className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </Link>
              ) : (
                <span aria-hidden />
              )}
              <span className="text-muted-foreground text-xs">
                Showing {from + 1}–{Math.min(to + 1, total)} of {total}
              </span>
              {page < totalPages ? (
                <Link
                  href={`/admin/content/blog?page=${page + 1}`}
                  rel="next"
                  className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
