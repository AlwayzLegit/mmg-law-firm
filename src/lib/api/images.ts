import "server-only";

import { randomUUID } from "node:crypto";

import { getServiceSupabase } from "@/lib/supabase/admin";

export const IMAGE_BUCKET = "media";
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

// Block obviously-internal hosts so the remote-fetch path isn't a trivial SSRF
// pivot. Not airtight against DNS rebinding, but the endpoint is API-key gated
// and only writes into the public media bucket.
const PRIVATE_HOST =
  /^(localhost|0\.0\.0\.0|127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.google\.internal)$/i;

function extFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/svg+xml") return "svg";
  return type.split("/")[1] ?? "bin";
}

function sanitizeBase(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "image"
  );
}

export type StoreResult =
  | { ok: true; url: string; name: string }
  | { ok: false; status: number; error: string };

/** Validate + store image bytes in the public media bucket. Generates a
 *  collision-proof key and returns the public URL. */
export async function storeImageBytes(
  bytes: Uint8Array,
  contentType: string,
  filename?: string,
): Promise<StoreResult> {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  if (!IMAGE_ALLOWED.has(type)) {
    return {
      ok: false,
      status: 415,
      error: `Unsupported image type: ${type || "unknown"}. Allowed: ${[...IMAGE_ALLOWED].join(", ")}.`,
    };
  }
  if (bytes.byteLength === 0) {
    return { ok: false, status: 400, error: "Empty image." };
  }
  if (bytes.byteLength > IMAGE_MAX_BYTES) {
    return { ok: false, status: 413, error: "Image exceeds the 10 MB limit." };
  }

  const key = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeBase(
    filename ?? "image",
  )}.${extFor(type)}`;

  const supabase = getServiceSupabase();
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(key, bytes, { contentType: type, upsert: false });
  if (error) return { ok: false, status: 500, error: error.message };

  const url = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(key).data
    .publicUrl;
  return { ok: true, url, name: key };
}

export type FetchResult =
  | { ok: true; bytes: Uint8Array; type: string }
  | { ok: false; status: number; error: string };

/** Fetch a remote image (SSRF-guarded) into memory for storage. */
export async function fetchRemoteImage(src: string): Promise<FetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return { ok: false, status: 400, error: "Invalid url." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, status: 400, error: "Only http(s) URLs are allowed." };
  }
  if (PRIVATE_HOST.test(parsed.hostname)) {
    return { ok: false, status: 400, error: "That host isn't allowed." };
  }

  let resp: Response;
  try {
    resp = await fetch(parsed, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, status: 502, error: "Couldn't fetch that URL." };
  }
  if (!resp.ok) {
    return { ok: false, status: 502, error: `Source returned HTTP ${resp.status}.` };
  }
  const type = (resp.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const bytes = new Uint8Array(await resp.arrayBuffer());
  return { ok: true, bytes, type };
}

/** Decode a base64 payload (raw or a data: URL) into bytes + inferred type. */
export function decodeBase64Image(
  data: string,
  contentType?: string,
): { bytes: Uint8Array; type: string } {
  let b64 = data.trim();
  let type = (contentType ?? "").toLowerCase();
  const dataUrl = /^data:([^;]+);base64,([\s\S]*)$/.exec(b64);
  if (dataUrl) {
    type = type || dataUrl[1].toLowerCase();
    b64 = dataUrl[2];
  }
  const bytes = new Uint8Array(Buffer.from(b64, "base64"));
  return { bytes, type };
}

export type ImageItem = {
  name: string;
  url: string;
  size: number | null;
  created_at: string | null;
};

/** List images in the bucket, newest first. */
export async function listImages(
  limit: number,
  offset: number,
): Promise<ImageItem[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .list("", {
      limit,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name && f.name !== ".emptyFolderPlaceholder")
    .map((f) => ({
      name: f.name,
      url: supabase.storage.from(IMAGE_BUCKET).getPublicUrl(f.name).data
        .publicUrl,
      size: (f.metadata as { size?: number } | null)?.size ?? null,
      created_at: f.created_at ?? null,
    }));
}

/** Delete one image by object name. */
export async function deleteImage(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([name]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Best-effort audit row for an image API write (no user session). */
export async function logImageAudit(
  action: string,
  diff?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await supabase.from("audit_log").insert({
      actor_id: null,
      entity: "media",
      entity_id: null,
      action,
      diff: { via: "admin_api", ...(diff ?? {}) },
    });
  } catch {
    // Audit gaps must never fail an API write.
  }
}
