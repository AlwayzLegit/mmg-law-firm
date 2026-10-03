import { CaseResultsEmptyGuide } from "@/components/admin/case-results-empty-guide";
import {
  AdminPageHeader,
  EmptyNote,
  GridHead,
  GridRow,
  Panel,
  SearchForm,
  TonePill,
} from "@/components/admin/ui";
import { sanitizeSearchTerm as sanitize } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";

import NewCaseResultForm from "./new-case-result-form";
import { requireAdmin } from "@/lib/auth/require-admin";

type Row = {
  id: string;
  headline: string;
  amount_display: string | null;
  year: number | null;
  is_published: boolean;
  created_at: string;
  practice_areas: { name: string } | null;
};

const COLS = "md:grid-cols-[minmax(0,2fr)_minmax(120px,0.8fr)_minmax(140px,1fr)_64px_96px]";

export default async function CaseResultsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const rawQ = (params.q ?? "").trim();
  const q = sanitize(rawQ);

  const supabase = await getServerSupabase();
  let query = supabase
    .from("case_results")
    .select(
      `id, headline, amount_display, year, is_published, created_at,
       practice_areas(name)`,
    )
    .order("is_published", { ascending: true })
    .order("created_at", { ascending: false });

  if (q) query = query.or(`headline.ilike.%${q}%,amount_display.ilike.%${q}%`);

  const { data, error } = await query;

  const rows = (data ?? []) as unknown as Row[];
  const drafts = rows.filter((r) => !r.is_published);
  const published = rows.filter((r) => r.is_published);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Content"
        title="Case Results"
        description="Anonymized recoveries. Published rows appear publicly with the past-results disclaimer in proximity. Per CRPC §7.1, never identify clients."
        actions={<NewCaseResultForm />}
      />

      {rows.length > 0 || rawQ ? (
        <SearchForm
          className="mt-6"
          action="/admin/case-results"
          value={rawQ}
          placeholder="Search headline or amount"
          ariaLabel="Search case results"
          clearHref="/admin/case-results"
        />
      ) : null}

      {error ? (
        <Panel className="mt-6">
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        </Panel>
      ) : rows.length === 0 && rawQ ? (
        <Panel className="mt-6">
          <EmptyNote>No case results match &ldquo;{rawQ}&rdquo;.</EmptyNote>
        </Panel>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <CaseResultsEmptyGuide />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <Panel title={`Drafts (${drafts.length})`}>
            {drafts.length === 0 ? <EmptyNote>No drafts.</EmptyNote> : <List rows={drafts} />}
          </Panel>

          <Panel title={`Published (${published.length})`}>
            {published.length === 0 ? <EmptyNote>No published case results yet.</EmptyNote> : <List rows={published} />}
          </Panel>
        </div>
      )}
    </div>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <div className="-mx-4">
      <GridHead cols={COLS}>
        <span>Headline</span>
        <span>Amount</span>
        <span>Practice area</span>
        <span>Year</span>
        <span>Status</span>
      </GridHead>
      {rows.map((r) => (
        <GridRow key={r.id} cols={COLS} href={`/admin/case-results/${r.id}`}>
          <span className="min-w-0 truncate font-semibold">{r.headline}</span>
          <span className="font-display text-[15px] font-semibold tracking-[-0.01em]">{r.amount_display ?? <span className="text-stone font-sans text-xs font-normal">Amount not set</span>}</span>
          <span className="text-stone min-w-0 truncate">{r.practice_areas?.name ?? "—"}</span>
          <span className="text-stone tabular-nums">{r.year ?? "—"}</span>
          <span>
            <TonePill tone={r.is_published ? "good" : "muted"}>{r.is_published ? "Published" : "Draft"}</TonePill>
          </span>
        </GridRow>
      ))}
    </div>
  );
}
