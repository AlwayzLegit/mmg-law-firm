import Link from "next/link";

import { CaseResultsEmptyGuide } from "@/components/admin/case-results-empty-guide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import NewCaseResultForm from "./new-case-result-form";

export default async function CaseResultsAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("case_results")
    .select(
      `id, headline, amount_display, year, is_published, created_at,
       practice_areas(name)`,
    )
    .order("is_published", { ascending: true })
    .order("created_at", { ascending: false });

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
          <p className="mt-1 text-sm text-muted-foreground">
            Anonymized recoveries. Published rows appear publicly with the
            past-results disclaimer in proximity. Per CRPC §7.1, never
            identify clients.
          </p>
        </div>
        <NewCaseResultForm />
      </div>

      {error ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error.message}</p>
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
                <p className="text-sm text-muted-foreground">No drafts.</p>
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
                <p className="text-sm text-muted-foreground">
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
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="py-3">
          <Link
            href={`/admin/case-results/${r.id}`}
            className="flex items-center justify-between gap-3 text-sm hover:text-primary"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{r.headline}</p>
              <p className="truncate text-xs text-muted-foreground">
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
