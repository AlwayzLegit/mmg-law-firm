import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Media
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload images and copy their URLs for hero images and post artwork.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {items.length} {items.length === 1 ? "image" : "images"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : (
            <MediaManager items={items} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
