import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * On-demand revalidation hook. Authorize via REVALIDATE_SECRET (header or
 * query). Body shape:
 *   { paths?: string[], tags?: string[] }
 *
 * Next.js 16 requires a cacheLife profile arg to revalidateTag. We use 'max'
 * since our content is infrequent and stale-while-revalidate is fine.
 */
export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-revalidate-secret");
  const secretQuery = new URL(request.url).searchParams.get("secret");
  const provided = secretHeader ?? secretQuery;

  if (!env.REVALIDATE_SECRET || provided !== env.REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, {
      status: 401,
    });
  }

  let body: { paths?: string[]; tags?: string[] };
  try {
    body = (await request.json()) as { paths?: string[]; tags?: string[] };
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-json" },
      { status: 400 },
    );
  }

  const revalidatedPaths: string[] = [];
  const revalidatedTags: string[] = [];

  for (const path of body.paths ?? []) {
    if (typeof path === "string" && path.startsWith("/")) {
      revalidatePath(path);
      revalidatedPaths.push(path);
    }
  }
  for (const tag of body.tags ?? []) {
    if (typeof tag === "string") {
      // Next.js 16 requires a cacheLife arg on revalidateTag.
      revalidateTag(tag, "max");
      revalidatedTags.push(tag);
    }
  }

  return NextResponse.json({
    ok: true,
    revalidatedPaths,
    revalidatedTags,
  });
}
