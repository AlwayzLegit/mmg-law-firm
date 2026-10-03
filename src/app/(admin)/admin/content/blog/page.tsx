import {
  AdminPageHeader,
  EmptyNote,
  FilterPill,
  GridHead,
  GridRow,
  Pager,
  Panel,
  SearchForm,
  TonePill,
  adminCode,
} from "@/components/admin/ui";
import { sanitizeSearchTerm as sanitize } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";

import NewPostForm from "./new-post-form";
import { requireAdmin } from "@/lib/auth/require-admin";

const PAGE_SIZE = 50;
const COLS = "md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_80px_minmax(120px,0.9fr)_90px]";
const STATUS_OPTIONS = ["all", "needs_review", "approved", "published", "draft"] as const;
type Status = (typeof STATUS_OPTIONS)[number];

export default async function ContentBlogAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  await requireAdmin();
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
    .select(
      "id, slug, title, is_published, published_at, updated_at, tags, review_status, created_via, primary_keyword",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (status === "published") query = query.eq("is_published", true);
  else if (status === "draft") query = query.eq("is_published", false);
  else if (status === "needs_review" || status === "approved") {
    query = query.eq("review_status", status);
  }
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
      <AdminPageHeader
        eyebrow="Content"
        title="Blog"
        description={
          <>
            Click any row to edit. Posts with a future <code className={adminCode}>published_at</code> stay hidden until that time.
          </>
        }
        actions={<NewPostForm />}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
          {STATUS_OPTIONS.map((s) => (
            <FilterPill key={s} href={hrefWith({ status: s, page: 1 })} active={status === s}>
              {s === "needs_review" ? "Needs review" : s}
            </FilterPill>
          ))}
        </nav>
        <SearchForm
          action="/admin/content/blog"
          value={rawQ}
          placeholder="Search title or slug"
          ariaLabel="Search posts"
          hidden={status !== "all" ? { status } : undefined}
          clearHref={hrefWith({ q: "" })}
        />
      </div>

      <Panel
        className="mt-6"
        title={`Posts (${total})`}
        action={totalPages > 1 ? <span className="text-stone text-xs">page {page} of {totalPages}</span> : null}
      >
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : !data || data.length === 0 ? (
          <EmptyNote>
            {rawQ || status !== "all" ? "No posts match these filters." : "No posts yet. Click New post to draft your first one."}
          </EmptyNote>
        ) : (
          <div className="-mx-4">
            <GridHead cols={COLS}>
              <span>Title</span>
              <span>Keyword · tags</span>
              <span>Source</span>
              <span>Status</span>
              <span>Updated</span>
            </GridHead>
            {data.map((p) => {
              const scheduled = p.is_published && p.published_at && new Date(p.published_at).getTime() > now;
              const review =
                !p.is_published && p.review_status === "needs_review"
                  ? { tone: "warn" as const, label: "Needs review" }
                  : !p.is_published && p.review_status === "approved"
                    ? { tone: "good" as const, label: "Approved" }
                    : !p.is_published && p.review_status === "rejected"
                      ? { tone: "bad" as const, label: "Rejected" }
                      : null;
              return (
                <GridRow key={p.id} cols={COLS} href={`/admin/content/blog/${p.id}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.title}</span>
                    <span className="text-stone block truncate font-mono text-[11px]">/blog/{p.slug}</span>
                  </span>
                  <span className="text-stone min-w-0 truncate text-xs">
                    {p.primary_keyword ? <span className="text-foreground font-medium">{p.primary_keyword}</span> : null}
                    {p.primary_keyword && p.tags.length > 0 ? " · " : ""}
                    {p.tags.slice(0, 3).join(", ")}
                  </span>
                  <span>
                    {p.created_via === "agent" || p.created_via === "admin_api" ? (
                      <TonePill tone="muted">{p.created_via === "agent" ? "Agent" : "API"}</TonePill>
                    ) : (
                      <span className="text-stone text-xs">Admin</span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {review ? <TonePill tone={review.tone}>{review.label}</TonePill> : null}
                    {scheduled ? (
                      <TonePill tone="warn">Scheduled</TonePill>
                    ) : (
                      <TonePill tone={p.is_published ? "ink" : "muted"}>{p.is_published ? "Published" : "Draft"}</TonePill>
                    )}
                  </span>
                  <time dateTime={p.updated_at} className="text-stone text-xs">
                    {new Date(p.updated_at).toLocaleDateString("en-US")}
                  </time>
                </GridRow>
              );
            })}
          </div>
        )}

        <Pager page={page} totalPages={totalPages} from={from} to={to} total={total} hrefFor={(p) => hrefWith({ page: p })} />
      </Panel>
    </div>
  );
}
