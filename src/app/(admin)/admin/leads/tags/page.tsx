import Link from "next/link";
import { Tag } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/require-admin";
import { tagCounts } from "@/lib/leads/tags";
import { getServerSupabase } from "@/lib/supabase/server";

import TagRow from "./tag-row";

export const metadata = {
  title: "Manage tags",
  robots: { index: false, follow: false },
};

export default async function LeadTagsPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();

  // Pull just the tag arrays and aggregate in-process — fine at a solo
  // firm's lead volume, and avoids an unnest RPC.
  const { data, error } = await supabase
    .from("leads")
    .select("tags")
    .neq("status", "spam")
    .limit(5000);

  const counts = tagCounts((data ?? []).map((r) => r.tags as string[] | null));

  return (
    <div>
      <Link
        href="/admin/leads"
        className="text-muted-foreground hover:text-primary text-sm"
      >
        ← Leads
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Manage tags
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rename a tag to fix a typo or to merge it into another (rename it to
          an existing tag). Deleting removes it from every lead. Spam is
          excluded from the counts.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" aria-hidden />
            Tags ({counts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : counts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No tags yet. Add tags from any lead&apos;s detail page.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {counts.map((c) => (
                <TagRow key={c.tag} tag={c.tag} count={c.count} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
