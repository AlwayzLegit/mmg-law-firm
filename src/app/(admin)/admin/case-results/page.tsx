import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function CaseResultsAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("case_results")
    .select("id, headline, amount_display, year, is_published")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Case Results
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anonymized results — published rows appear publicly with the proximity
        past-results disclaimer.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">All results</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No case results yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{r.headline}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.amount_display ?? "—"}
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
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
