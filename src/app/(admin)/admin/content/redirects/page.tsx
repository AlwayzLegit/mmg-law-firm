import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSupabase } from "@/lib/supabase/server";

import RedirectsManager, { type RedirectRow } from "./redirects-manager";

export const dynamic = "force-dynamic";

export default async function RedirectsPage() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from("redirects")
    .select("id, source_path, destination, permanent")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as RedirectRow[];

  return (
    <div>
      <Link
        href="/admin/content/pages"
        className="text-sm text-muted-foreground hover:text-primary"
      >
        ← Content
      </Link>

      <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
        Redirects
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send an old or changed URL to a new one. Applied site-wide within a
        minute of saving. Use 301 (permanent) for SEO-preserving moves.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} {rows.length === 1 ? "redirect" : "redirects"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : (
            <RedirectsManager rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
