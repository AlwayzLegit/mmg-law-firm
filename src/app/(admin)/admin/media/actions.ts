"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { logAudit } from "@/lib/audit";
import { getServiceSupabase } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);
const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "media";

export type UploadResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

export async function uploadMedia(formData: FormData): Promise<UploadResult> {
  const { user } = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      error: "Only image files (PNG, JPG, WebP, GIF, AVIF, SVG).",
    };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Max file size is 10 MB." };
  }

  const supabase = getServiceSupabase();
  const safe =
    file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file";
  const key = `${Date.now()}-${safe}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: error.message };

  const url = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  logAudit({
    actor_id: user.id,
    entity: "media",
    entity_id: null,
    action: "upload",
    diff: { name: key },
  });
  revalidatePath("/admin/media");
  return { ok: true, url, name: key };
}

export async function deleteMedia(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { user } = await requireAdmin();

  const name = String(formData.get("name") ?? "");
  if (!name) return { ok: false, error: "Invalid file." };

  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) return { ok: false, error: error.message };

  logAudit({
    actor_id: user.id,
    entity: "media",
    entity_id: null,
    action: "delete",
    diff: { name },
  });
  revalidatePath("/admin/media");
  return { ok: true };
}
