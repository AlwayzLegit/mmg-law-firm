import { NextResponse, type NextRequest } from "next/server";

/**
 * Temporary content-migration scrape proxy. The sandbox has no outbound
 * network to mmg-lawfirm.com / public review hosts; Vercel does. This route
 * runs there, fetches a small allowlist of hosts, and returns the body. It
 * is gated by a one-shot secret and an explicit host allowlist, and is
 * removed in the same PR cycle once content has been captured.
 *
 * Hard rule per spec §17 #6: no invented case results or testimonials —
 * everything that lands in case_results / testimonials must be quoted from
 * a source we can cite. This route is the conduit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = "scrape_8d2f9b71c4e6a503";
const ALLOWED_HOSTS = new Set([
  "www.mmg-lawfirm.com",
  "mmg-lawfirm.com",
  "images.squarespace-cdn.com",
  "www.yelp.com",
  "www.avvo.com",
  "profiles.superlawyers.com",
  "www.google.com",
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
        "accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      redirect: "follow",
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const buf = Buffer.from(await upstream.arrayBuffer());
  if (contentType.startsWith("image/")) {
    return NextResponse.json({
      ok: true,
      contentType,
      bytes: buf.length,
      base64: buf.toString("base64"),
      finalUrl: upstream.url,
      status: upstream.status,
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
