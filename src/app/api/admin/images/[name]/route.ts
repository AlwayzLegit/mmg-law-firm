import "server-only";

import { authorizeAdminApi, json } from "@/lib/api/auth";
import {
  deleteImage,
  IMAGE_BUCKET,
  logImageAudit,
} from "@/lib/api/images";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ name: string }> };

// Object keys are flat (no slashes) and URL-encoded in the path segment.
function decodeName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** GET /api/admin/images/:name — public URL + metadata for one object. */
export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;
  const name = decodeName((await ctx.params).name);

  const supabase = getServiceSupabase();
  // list() with a search filter is the cheapest existence check the Storage
  // API offers for a single object.
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list("", { limit: 1, search: name });
  if (error) return json(500, { error: error.message });
  const hit = (data ?? []).find((f) => f.name === name);
  if (!hit) return json(404, { error: "Image not found." });

  const url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(name).data
    .publicUrl;
  return json(200, {
    image: {
      name,
      url,
      size: (hit.metadata as { size?: number } | null)?.size ?? null,
      created_at: hit.created_at ?? null,
    },
  });
}

/** DELETE /api/admin/images/:name — remove one object. */
export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const denied = authorizeAdminApi(req);
  if (denied) return denied;
  const name = decodeName((await ctx.params).name);
  if (!name) return json(400, { error: "Missing image name." });

  const result = await deleteImage(name);
  if (!result.ok) return json(500, { error: result.error });

  await logImageAudit("delete", { name });
  return json(200, { deleted: true, name });
}
