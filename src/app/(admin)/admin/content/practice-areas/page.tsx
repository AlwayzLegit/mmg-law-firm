import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function ContentPracticeAreasAdmin() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("practice_areas")
    .select(
      "id, slug, name, intro_md, body_md, is_published, display_order, updated_at",
    )
    .order("display_order");

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Practice areas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per practice area the firm handles. The list is fixed —
          edit the editorial copy here. Until a row is published, the public
          page renders the in-code fallback content (marked as such for
          attorney review).
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            Areas ({data?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No practice areas in DB yet — apply migration{" "}
              <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">
                0005_practice_areas_editor.sql
              </code>{" "}
              to seed the canonical list.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((p) => {
                const hasBody = Boolean(p.body_md?.trim());
                return (
                  <li key={p.id} className="py-3">
                    <Link
                      href={`/admin/content/practice-areas/${p.id}`}
                      className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          /practice-areas/{p.slug}
                          {!hasBody ? " · using static fallback copy" : ""}
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-2 text-xs">
                        {!hasBody ? (
                          <span className="rounded-md bg-warning/10 px-2 py-0.5 font-medium text-warning">
                            Body empty
                          </span>
                        ) : null}
                        <span
                          className={`rounded-md px-2 py-0.5 font-medium ${
                            p.is_published
                              ? "bg-success/10 text-success"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {p.is_published ? "Published" : "Draft"}
                        </span>
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
        </CardContent>
      </Card>
    </div>
  );
}
