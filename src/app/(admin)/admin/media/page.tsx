import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { getServiceSupabase } from "@/lib/supabase/admin";

import MediaManager, { type MediaItem } from "./media-manager";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const BUCKET = "media";

export default async function MediaPage() {
  await requireAdmin();
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    limit: 200,
    sortBy: { column: "created_at", order: "desc" },
  });

  const items: MediaItem[] = (data ?? [])
    .filter((f) => f.name && f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      url: supabase.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
    }));

  return (
    <div>
      <AdminPageHeader
        eyebrow="Library"
        title="Media"
        description="Upload images and copy their URLs for hero images and post artwork."
      />

      <Panel className="mt-6" title={`${items.length} ${items.length === 1 ? "image" : "images"}`}>
        {error ? <p className="text-[13px] text-[#b91c1c]">{error.message}</p> : <MediaManager items={items} />}
      </Panel>
    </div>
  );
}
