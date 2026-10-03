import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  KanbanSquare,
  PlayCircle,
  Search,
  Tag,
} from "lucide-react";

import { AdminPageHeader, FilterPill, adminBtn, adminInput } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getTagVocabulary } from "@/lib/data/lead-tags";
import { sanitizeSearchTerm as sanitize, slugish } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import LeadsTable, { type LeadRow } from "./leads-table";
import SavedViews, { type SavedView } from "./saved-views";

const ASSIGNEE_OPTIONS = ["all", "me", "unassigned"] as const;
type Assignee = (typeof ASSIGNEE_OPTIONS)[number];

const STATUS_OPTIONS = [
  "all",
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
] as const;

const CLOSED = ["signed", "rejected", "spam"];

type SearchParams = {
  status?: string;
  q?: string;
  due?: string;
  page?: string;
  source?: string;
  pa?: string;
  county?: string;
  assignee?: string;
  tag?: string;
};

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = STATUS_OPTIONS.includes(
    (params.status ?? "all") as (typeof STATUS_OPTIONS)[number],
  )
    ? (params.status ?? "all")
    : "all";
  const due = params.due === "1";
  const rawQ = (params.q ?? "").trim();
  const q = sanitize(rawQ);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const source = slugish(params.source);
  const paSlug = slugish(params.pa);
  const countySlug = slugish(params.county);
  const assignee: Assignee = ASSIGNEE_OPTIONS.includes(
    params.assignee as Assignee,
  )
    ? (params.assignee as Assignee)
    : "all";
  const tag = (params.tag ?? "").trim().toLowerCase().slice(0, 30);

  const { user } = await requireAdmin();
  const supabase = await getServerSupabase();

  // Resolve drill-down slugs to FK ids (from analytics rankings).
  let paId: string | null = null;
  let paName: string | null = null;
  if (paSlug) {
    const { data } = await supabase
      .from("practice_areas")
      .select("id, name")
      .eq("slug", paSlug)
      .maybeSingle();
    paId = data?.id ?? null;
    paName = (data?.name as string | undefined) ?? null;
  }
  let countyId: string | null = null;
  let countyName: string | null = null;
  if (countySlug) {
    const { data } = await supabase
      .from("counties")
      .select("id, name")
      .eq("slug", countySlug)
      .maybeSingle();
    countyId = data?.id ?? null;
    countyName = (data?.name as string | undefined) ?? null;
  }

  let query = supabase
    .from("leads")
    .select(
      "id, full_name, phone, email, status, created_at, follow_up_at, tags",
      {
        count: "exact",
      },
    )
    // Merged duplicates drop out of every list view.
    .is("merged_into", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (source) query = query.eq("utm_source", source);
  if (paId) query = query.eq("practice_area_id", paId);
  if (countyId) query = query.eq("county_id", countyId);
  if (tag) query = query.contains("tags", [tag]);
  if (assignee === "me") query = query.eq("assigned_to", user.id);
  else if (assignee === "unassigned") query = query.is("assigned_to", null);

  if (due) {
    query = query
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", new Date().toISOString())
      .not("status", "in", `(${CLOSED.join(",")})`)
      .order("follow_up_at", { ascending: true });
  } else if (status !== "all") {
    query = query.eq("status", status);
  } else {
    // Default view excludes spam — explicit filter shows them.
    query = query.neq("status", "spam");
  }

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  const rows = (data ?? []) as LeadRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // This admin's saved filter presets (RLS scopes to the owner).
  const { data: viewRows } = await supabase
    .from("lead_saved_views")
    .select("id, name, query")
    .order("created_at", { ascending: true });
  const savedViews = (viewRows ?? []) as SavedView[];

  // Existing tag vocabulary for the bulk-tag autocomplete.
  const tagSuggestions = await getTagVocabulary(supabase);

  // Common filter params shared by page links + export.
  function applyFilters(sp: URLSearchParams) {
    if (due) sp.set("due", "1");
    else if (status !== "all") sp.set("status", status);
    if (rawQ) sp.set("q", rawQ);
    if (source) sp.set("source", source);
    if (paSlug) sp.set("pa", paSlug);
    if (countySlug) sp.set("county", countySlug);
    if (assignee !== "all") sp.set("assignee", assignee);
    if (tag) sp.set("tag", tag);
  }

  // Build an assignee-filter link that keeps status/due/search but resets page.
  function assigneeHref(target: Assignee): string {
    const sp = new URLSearchParams();
    if (due) sp.set("due", "1");
    else if (status !== "all") sp.set("status", status);
    if (rawQ) sp.set("q", rawQ);
    if (source) sp.set("source", source);
    if (paSlug) sp.set("pa", paSlug);
    if (countySlug) sp.set("county", countySlug);
    if (tag) sp.set("tag", tag);
    if (target !== "all") sp.set("assignee", target);
    const qs = sp.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  }

  // Build a querystring for page links that preserves the active filters.
  function pageHref(targetPage: number): string {
    const sp = new URLSearchParams();
    applyFilters(sp);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return `/admin/leads${qs ? `?${qs}` : ""}`;
  }

  // Preserve the active filters in the export link.
  const exportParams = new URLSearchParams();
  applyFilters(exportParams);
  const exportHref = `/admin/leads/export${exportParams.toString() ? `?${exportParams}` : ""}`;

  // Link that drops just the tag filter, keeping everything else.
  const tagClearParams = new URLSearchParams();
  applyFilters(tagClearParams);
  tagClearParams.delete("tag");
  const clearTagHref = `/admin/leads${tagClearParams.toString() ? `?${tagClearParams}` : ""}`;

  // Current filters as a querystring, for the saved-views "save current" +
  // active-view highlighting (page is never part of a view).
  const viewParams = new URLSearchParams();
  applyFilters(viewParams);
  const currentQuery = viewParams.toString();

  // Active drill-down filter, for a removable chip.
  const drillLabel = source
    ? `Source: ${source}`
    : paId
      ? `Practice area: ${paName ?? paSlug}`
      : countyId
        ? `County: ${countyName ?? countySlug}`
        : null;

  return (
    <div>
      <AdminPageHeader
        title="Leads"
        description={
          <>
            {due
              ? "Follow-ups that are due or overdue, soonest first."
              : "Most recent first. Click any name for details. Tick rows for bulk actions."}
            {!due && status === "all" ? " Spam is hidden — pick the spam filter to review." : null}
          </>
        }
        actions={
          <>
            {/* Plain anchor: /admin/leads/next is a redirecting route handler,
                not a page, so we want a full navigation (not RSC prefetch). */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/leads/next" className={adminBtn.ink}>
              <PlayCircle className="text-gold h-3.5 w-3.5" aria-hidden />
              Work next
            </a>
            <Link href="/admin/leads/board" className={adminBtn.outline}>
              <KanbanSquare className="h-3.5 w-3.5" aria-hidden />
              Board view
            </Link>
            <Link href="/admin/leads/tags" className={adminBtn.outline}>
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Manage tags
            </Link>
            <a href={exportHref} className={adminBtn.outline}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export CSV
            </a>
          </>
        }
      />

      <SavedViews views={savedViews} currentQuery={currentQuery} activeQuery={currentQuery} />

      {drillLabel || tag ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {drillLabel ? (
            <span className="bg-gold/16 text-gold-deep inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              {drillLabel}
              <Link
                href={due ? "/admin/leads?due=1" : status !== "all" ? `/admin/leads?status=${status}` : "/admin/leads"}
                aria-label="Clear this filter"
                className="no-underline hover:opacity-70"
              >
                ✕
              </Link>
            </span>
          ) : null}
          {tag ? (
            <span className="bg-gold/16 text-gold-deep inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              Tag: {tag}
              <Link href={clearTagHref} aria-label="Clear tag filter" className="no-underline hover:opacity-70">
                ✕
              </Link>
            </span>
          ) : null}
        </div>
      ) : null}

      <form method="get" className="mt-[18px] flex flex-wrap items-center gap-2.5">
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        {due ? <input type="hidden" name="due" value="1" /> : null}
        {!due && status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        {source ? <input type="hidden" name="source" value={source} /> : null}
        {paSlug ? <input type="hidden" name="pa" value={paSlug} /> : null}
        {countySlug ? <input type="hidden" name="county" value={countySlug} /> : null}
        {assignee !== "all" ? <input type="hidden" name="assignee" value={assignee} /> : null}
        <div className="relative flex-[1_1_260px]">
          <Search className="text-stone pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="Search name, email, or phone"
            aria-label="Search leads"
            className={cn(adminInput, "pl-10")}
          />
        </div>
        <button type="submit" className={adminBtn.ink}>
          Search
        </button>
        {rawQ ? (
          <Link href={due ? "/admin/leads?due=1" : `/admin/leads?status=${status}`} className={adminBtn.ghost}>
            Clear
          </Link>
        ) : null}
      </form>

      <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Filter by status">
        {STATUS_OPTIONS.map((s) => (
          <FilterPill key={s} href={`/admin/leads${s === "all" ? "" : `?status=${s}`}`} active={!due && status === s}>
            {s}
          </FilterPill>
        ))}
        <FilterPill href="/admin/leads?due=1" active={due}>
          Follow-ups due
        </FilterPill>
      </nav>

      <nav className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Filter by assignee">
        <span className="text-stone mr-1 text-xs">Assignee:</span>
        {ASSIGNEE_OPTIONS.map((opt) => (
          <FilterPill key={opt} href={assigneeHref(opt)} active={assignee === opt} className="h-[30px]">
            {opt === "all" ? "Anyone" : opt === "me" ? "Mine" : "Unassigned"}
          </FilterPill>
        ))}
      </nav>

      <div className="mt-3.5">
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : (
          <LeadsTable
            rows={rows}
            status={status}
            tagSuggestions={tagSuggestions}
            fromQuery={currentQuery}
            footer={
              <>
                <span>
                  {total} matching {total === 1 ? "lead" : "leads"}
                  {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
                </span>
                {totalPages > 1 ? (
                  <nav className="flex items-center gap-2" aria-label="Pagination">
                    {page > 1 ? (
                      <Link href={pageHref(page - 1)} rel="prev" className={adminBtn.pill}>
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                        Previous
                      </Link>
                    ) : null}
                    <span>
                      {from + 1}–{Math.min(to + 1, total)} of {total}
                    </span>
                    {page < totalPages ? (
                      <Link href={pageHref(page + 1)} rel="next" className={adminBtn.pill}>
                        Next
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    ) : null}
                  </nav>
                ) : (
                  <span>Showing all</span>
                )}
              </>
            }
          />
        )}
      </div>
    </div>
  );
}
