import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import EditForm from "./edit-form";
import ApproveControl from "./approve-control";
import DeleteButton from "./delete-button";
import { requireAdmin } from "@/lib/auth/require-admin";

type Props = { params: Promise<{ id: string }> };

export default async function TestimonialEditorPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [rowResult, practicesResult] = await Promise.all([
    supabase
      .from("testimonials")
      .select(
        "id, client_initials, city, practice_area_id, quote, rating, source, is_approved, approved_at, display_order, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("practice_areas")
      .select("id, name")
      .order("display_order"),
  ]);

  if (rowResult.error) throw rowResult.error;
  if (!rowResult.data) notFound();
  const row = rowResult.data;

  return (
    <div>
      <Link
        href="/admin/content/testimonials"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← All testimonials
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">
            {row.client_initials}
            {row.city ? <span className="text-muted-foreground"> · {row.city}</span> : null}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Created {new Date(row.created_at).toLocaleString("en-US")}
            {row.approved_at
              ? ` · approved ${new Date(row.approved_at).toLocaleString("en-US")}`
              : ""}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
            row.is_approved
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {row.is_approved ? "Approved (public)" : "Pending review"}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditForm
          id={row.id}
          client_initials={row.client_initials}
          city={row.city ?? ""}
          practice_area_id={row.practice_area_id ?? ""}
          quote={row.quote}
          rating={row.rating ?? 0}
          source={row.source ?? ""}
          display_order={row.display_order}
          practiceAreas={practicesResult.data ?? []}
        />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approve for public display</CardTitle>
            </CardHeader>
            <CardContent>
              <ApproveControl
                id={row.id}
                isApproved={row.is_approved}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Approved testimonials appear on /reviews and may surface on
                the homepage. Only approve copy you&apos;ve cleared with the
                client.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteButton id={row.id} initials={row.client_initials} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
