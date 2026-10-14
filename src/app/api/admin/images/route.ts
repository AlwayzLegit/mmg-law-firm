import "server-only";

import { authenticateApi, clampInt, json } from "@/lib/api/auth";
import {
  decodeBase64Image,
  fetchRemoteImage,
  listImages,
  logImageAudit,
  storeImageBytes,
} from "@/lib/api/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/images — list uploaded images (newest first).
 * Query: limit (1–100, default 50), offset (default 0).
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["images:read"]);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 1, 100, 50);
  const offset = clampInt(url.searchParams.get("offset"), 0, 1e9, 0);

  try {
    const images = await listImages(limit, offset);
    return json(200, { images, limit, offset });
  } catch (err) {
    return json(500, {
      error: err instanceof Error ? err.message : "Failed to list images.",
    });
  }
}

/**
 * POST /api/admin/images — upload an image. Three ways, for whatever the
 * caller (n8n, Cowork, a script) has on hand:
 *
 *  1. multipart/form-data with a `file` field (binary upload).
 *  2. application/json { "url": "https://…/photo.jpg" } — server fetches it.
 *  3. application/json { "data": "<base64 or data: URL>", "filename"?, "content_type"? }
 *
 * Returns 201 { image: { url, name } }. The `url` is a public CDN URL ready to
 * drop into a blog post's hero_image_url or inline markdown.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["images:write"]);
  if (!auth.ok) return auth.response;

  const ctype = (req.headers.get("content-type") ?? "").toLowerCase();

  let bytes: Uint8Array;
  let contentType: string;
  let filename: string | undefined;
  let source = "binary";

  if (ctype.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return json(400, { error: "Attach a non-empty `file` field." });
    }
    bytes = new Uint8Array(await file.arrayBuffer());
    contentType = file.type;
    filename = file.name;
  } else if (ctype.includes("application/json")) {
    let body: { url?: string; data?: string; filename?: string; content_type?: string };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Body must be valid JSON." });
    }

    if (body.url) {
      const fetched = await fetchRemoteImage(body.url.trim());
      if (!fetched.ok) return json(fetched.status, { error: fetched.error });
      bytes = fetched.bytes;
      contentType = fetched.type;
      filename =
        body.filename ?? new URL(body.url).pathname.split("/").pop() ?? "image";
      source = "url";
    } else if (body.data) {
      const decoded = decodeBase64Image(body.data, body.content_type);
      bytes = decoded.bytes;
      contentType = decoded.type;
      filename = body.filename ?? "image";
      source = "base64";
    } else {
      return json(400, {
        error: "Provide `url` (remote image) or `data` (base64).",
      });
    }
  } else {
    return json(415, {
      error:
        "Use multipart/form-data with a `file` field, or application/json with `url` or `data`.",
    });
  }

  const stored = await storeImageBytes(bytes, contentType, filename);
  if (!stored.ok) return json(stored.status, { error: stored.error });

  await logImageAudit("upload", { name: stored.name, source }, auth.principal);
  return json(201, { image: { url: stored.url, name: stored.name } });
}
