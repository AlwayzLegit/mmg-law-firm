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

/**
 * Remove duplicate uploads from the bucket — files with an identical content
 * signature (eTag + size), keeping the earliest of each set. Returns how many
 * were removed. Uses the Storage API (service role), which is the only
 * supported way to delete objects (direct SQL deletes are blocked).
 */
export async function removeDuplicateMedia(): Promise<
  { ok: true; removed: number } | { ok: false; error: string }
> {
  const { user } = await requireAdmin();
  const supabase = getServiceSupabase();

  const { data: items, error } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
  if (error) return { ok: false, error: error.message };

  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const it of items ?? []) {
    const meta = (it.metadata ?? {}) as { eTag?: string; size?: number };
    if (!meta.eTag && meta.size == null) continue; // skip folders/odd rows
    const sig = `${meta.eTag ?? ""}:${meta.size ?? ""}`;
    if (seen.has(sig)) dupes.push(it.name);
    else seen.add(sig);
  }

  if (dupes.length === 0) return { ok: true, removed: 0 };

  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(dupes);
  if (rmErr) return { ok: false, error: rmErr.message };

  logAudit({
    actor_id: user.id,
    entity: "media",
    entity_id: null,
    action: "dedupe",
    diff: { removed: dupes.length },
  });
  revalidatePath("/admin/media");
  return { ok: true, removed: dupes.length };
}

/**
 * Block obviously-internal hosts to keep this admin-only fetch from being a
 * trivial SSRF pivot. Not airtight against DNS rebinding, but this action is
 * gated behind `requireAdmin` and only writes images into the public bucket.
 */
const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.google\.internal)$/i;

export type ImportResult =
  | { ok: true; url: string; name: string }
  | { ok: false; error: string };

/**
 * Pull an image from a remote URL into the `media` bucket. Runs server-side
 * (Vercel has outbound network access), so it bridges sources that can't be
 * uploaded directly — e.g. generated images hosted elsewhere. An optional
 * `name` lets the object match a stable key referenced from code.
 */
export async function importMediaFromUrl(
  formData: FormData,
): Promise<ImportResult> {
  const { user } = await requireAdmin();

  const src = String(formData.get("url") ?? "").trim();
  const rename = String(formData.get("name") ?? "").trim();

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return { ok: false, error: "Enter a valid URL." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only http(s) URLs are allowed." };
  }
  if (PRIVATE_HOST.test(parsed.hostname)) {
    return { ok: false, error: "That host isn't allowed." };
  }

  let resp: Response;
  try {
    resp = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return {
      ok: false,
      error: "Couldn't fetch that URL (timeout or network).",
    };
  }
  if (!resp.ok) {
    return { ok: false, error: `Source returned HTTP ${resp.status}.` };
  }

  const type = (resp.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED.has(type)) {
    return {
      ok: false,
      error: `Not an allowed image type (${type || "unknown"}).`,
    };
  }

  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength === 0)
    return { ok: false, error: "Source file is empty." };
  if (buf.byteLength > MAX_BYTES) {
    return { ok: false, error: "Image exceeds the 10 MB limit." };
  }

  const ext =
    type === "image/jpeg" ? "jpg" : type.split("/")[1].replace("+xml", "");
  const base =
    (rename || parsed.pathname.split("/").pop() || "image")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image";
  const key = base.includes(".") ? base : `${base}.${ext}`;

  const supabase = getServiceSupabase();
  // upsert so re-importing under the same name replaces (lets us swap an image
  // without churning its referenced object key).
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buf, { contentType: type, upsert: true });
  if (error) return { ok: false, error: error.message };

  const url = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  logAudit({
    actor_id: user.id,
    entity: "media",
    entity_id: null,
    action: "import",
    diff: { name: key, src: parsed.href },
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
