// TEMPORARY scraper used to migrate content from the live mmg-lawfirm.com
// site into this app. The repo's sandbox can't reach external hosts, but
// Vercel's serverless functions do, so this route is invoked via the
// Vercel MCP web_fetch_vercel_url tool, returns the upstream HTML, and
// will be DELETED in the immediate next commit once content is captured.
//
// Gated by:
//  - a one-shot secret in the URL (matches a value only this AI session knows),
//  - a strict hostname allowlist (mmg-lawfirm.com only).

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "scrape_4f7a8c2d1b9e3f60";
const ALLOWED_HOST = "www.mmg-lawfirm.com";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("s") !== SECRET) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const target = url.searchParams.get("u");
  if (!target) {
    return new NextResponse("missing u", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }

  if (parsed.host !== ALLOWED_HOST) {
    return new NextResponse("host not allowed", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.5",
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

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-final-url": upstream.url,
    },
  });
}
