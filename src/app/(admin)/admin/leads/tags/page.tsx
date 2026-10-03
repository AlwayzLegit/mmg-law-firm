import { Tag } from "lucide-react";

import { AdminPageHeader, EmptyNote, Panel } from "@/components/admin/ui";
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
      <AdminPageHeader
        back={{ href: "/admin/leads", label: "Leads" }}
        eyebrow="Leads"
        title="Manage tags"
        description="Rename a tag to fix a typo or to merge it into another (rename it to an existing tag). Deleting removes it from every lead. Spam is excluded from the counts."
      />

      <Panel
        className="mt-6 max-w-3xl"
        title={
          <span className="inline-flex items-center gap-2">
            <Tag className="text-gold-deep h-4 w-4" aria-hidden />
            Tags ({counts.length})
          </span>
        }
      >
        {error ? (
          <p className="m-0 text-[13px] text-[#b91c1c]">{error.message}</p>
        ) : counts.length === 0 ? (
          <EmptyNote>No tags yet. Add tags from any lead&apos;s detail page.</EmptyNote>
        ) : (
          <ul className="divide-line m-0 list-none divide-y p-0">
            {counts.map((c) => (
              <TagRow key={c.tag} tag={c.tag} count={c.count} />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
