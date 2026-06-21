import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeSearchTerm as sanitize } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";

import NewPostForm from "./new-post-form";

const PAGE_SIZE = 50;
const STATUS_OPTIONS = ["all", "published", "draft"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

export default async function ContentBlogAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const status: Status = STATUS_OPTIONS.includes(params.status as Status)
    ? (params.status as Status)
    : "all";
  const rawQ = (params.q ?? "").trim();
  const q = sanitize(rawQ);

  const supabase = await getServerSupabase();
  let query = supabase
    .from("blog_posts")
    .select("id, slug, title, is_published, published_at, updated_at, tags", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (status === "published") query = query.eq("is_published", true);
  else if (status === "draft") query = query.eq("is_published", false);
  if (q) query = query.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);

  const { data, error, count } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  function hrefWith(overrides: {
    page?: number;
    status?: Status;
    q?: string;
  }): string {
    const sp = new URLSearchParams();
    const s = overrides.status ?? status;
    const qq = overrides.q ?? rawQ;
    const p = overrides.page ?? 1;
    if (s !== "all") sp.set("status", s);
    if (qq) sp.set("q", qq);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/content/blog${qs ? `?${qs}` : ""}`;
  }

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

      <form method="get" className="mt-6 flex max-w-md items-center gap-2">
        {status !== "all" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="Search title or slug"
            aria-label="Search posts"
            className="border-border bg-background focus:ring-ring h-9 w-full rounded-md border pr-3 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md px-4 text-sm font-medium"
        >
          Search
        </button>
        {rawQ ? (
          <Link
            href={hrefWith({ q: "" })}
            className="text-muted-foreground hover:text-primary text-xs"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Filter by status">
        {STATUS_OPTIONS.map((s) => (
          <Link
            key={s}
            href={hrefWith({ status: s, page: 1 })}
            className={`border-border rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "border-primary/40 bg-primary/10 text-primary"
                : "hover:bg-secondary"
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

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
              {rawQ || status !== "all"
                ? "No posts match these filters."
                : "No posts yet. Click New post to draft your first one."}
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
                  href={hrefWith({ page: page - 1 })}
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
                  href={hrefWith({ page: page + 1 })}
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
