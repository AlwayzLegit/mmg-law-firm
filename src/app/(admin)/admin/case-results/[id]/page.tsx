import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import EditForm from "./edit-form";
import PublishToggle from "./publish-toggle";
import DeleteButton from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function CaseResultEditorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [rowResult, practicesResult, countiesResult] = await Promise.all([
    supabase
      .from("case_results")
      .select(
        "id, headline, amount_cents, amount_display, practice_area_id, county_id, year, anonymized_summary_md, is_published, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("practice_areas")
      .select("id, name")
      .order("display_order"),
    supabase
      .from("counties")
      .select("id, name")
      .order("name"),
  ]);

  if (rowResult.error) throw rowResult.error;
  if (!rowResult.data) notFound();
  const row = rowResult.data;

  return (
    <div>
      <Link
        href="/admin/case-results"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All case results
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {row.headline}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(row.created_at).toLocaleString("en-US")}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            row.is_published
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {row.is_published ? "Published" : "Draft"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={row.id}
          headline={row.headline}
          amount_cents={row.amount_cents != null ? String(row.amount_cents) : ""}
          amount_display={row.amount_display ?? ""}
          practice_area_id={row.practice_area_id ?? ""}
          county_id={row.county_id ?? ""}
          year={row.year ?? 0}
          anonymized_summary_md={row.anonymized_summary_md ?? ""}
          practiceAreas={practicesResult.data ?? []}
          counties={countiesResult.data ?? []}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publish</CardTitle>
            </CardHeader>
            <CardContent>
              <PublishToggle id={row.id} isPublished={row.is_published} />
              <p className="mt-2 text-xs text-muted-foreground">
                Once published this row appears on /case-results and may
                surface on the homepage. The past-results disclaimer renders
                in proximity automatically.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteButton id={row.id} headline={row.headline} />
              <p className="mt-2 text-xs text-muted-foreground">
                Delete is permitted only for unpublished rows.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
