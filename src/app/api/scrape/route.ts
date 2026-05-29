// TEMPORARY binary-capable scraper used to migrate brand assets (logo,
// favicon) from the live mmg-lawfirm.com site. Will be removed in the
// same content-migration sweep that uses it.

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "scrape_4f7a8c2d1b9e3f60";
const ALLOWED_HOSTS = new Set([
  "www.mmg-lawfirm.com",
  "images.squarespace-cdn.com",
]);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("s") !== SECRET) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const target = url.searchParams.get("u");
  if (!target) return new NextResponse("missing u", { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.host)) {
    return new NextResponse("host not allowed", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      redirect: "follow",
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const buf = Buffer.from(await upstream.arrayBuffer());

  // For binary responses (images), return a JSON envelope with base64 so
  // the MCP fetcher (which treats responses as text) doesn't mangle it.
  if (contentType.startsWith("image/") || contentType.startsWith("application/octet-stream")) {
    return NextResponse.json({
      ok: true,
      contentType,
      bytes: buf.length,
      base64: buf.toString("base64"),
      finalUrl: upstream.url,
    });
  }

  return new NextResponse(buf, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
      "x-final-url": upstream.url,
    },
  });
}
