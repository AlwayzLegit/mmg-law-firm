import Link from "next/link";
import { Search } from "lucide-react";

import { CaseResultsEmptyGuide } from "@/components/admin/case-results-empty-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeSearchTerm as sanitize } from "@/lib/search";
import { getServerSupabase } from "@/lib/supabase/server";

import NewCaseResultForm from "./new-case-result-form";

export default async function CaseResultsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
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

  type Row = {
    id: string;
    headline: string;
    amount_display: string | null;
    year: number | null;
    is_published: boolean;
    created_at: string;
    practice_areas: { name: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const drafts = rows.filter((r) => !r.is_published);
  const published = rows.filter((r) => r.is_published);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            Case Results
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Anonymized recoveries. Published rows appear publicly with the
            past-results disclaimer in proximity. Per CRPC §7.1, never identify
            clients.
          </p>
        </div>
        <NewCaseResultForm />
      </div>

      {rows.length > 0 || rawQ ? (
        <form method="get" className="mt-6 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={rawQ}
              placeholder="Search headline or amount"
              aria-label="Search case results"
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
              href="/admin/case-results"
              className="text-muted-foreground hover:text-primary text-xs"
            >
              Clear
            </Link>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error.message}</p>
          </CardContent>
        </Card>
      ) : rows.length === 0 && rawQ ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              No case results match &ldquo;{rawQ}&rdquo;.
            </p>
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <CaseResultsEmptyGuide />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Drafts ({drafts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drafts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No drafts.</p>
              ) : (
                <List rows={drafts} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Published ({published.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {published.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No published case results yet.
                </p>
              ) : (
                <List rows={published} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

type Row = {
  id: string;
  headline: string;
  amount_display: string | null;
  year: number | null;
  is_published: boolean;
  created_at: string;
  practice_areas: { name: string } | null;
};

function List({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-border divide-y">
      {rows.map((r) => (
        <li key={r.id} className="py-3">
          <Link
            href={`/admin/case-results/${r.id}`}
            className="hover:text-primary flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{r.headline}</p>
              <p className="text-muted-foreground truncate text-xs">
                {r.amount_display ?? "Amount not set"}
                {r.practice_areas?.name ? ` · ${r.practice_areas.name}` : ""}
                {r.year ? ` · ${r.year}` : ""}
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                r.is_published
                  ? "bg-success/10 text-success"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {r.is_published ? "Published" : "Draft"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
