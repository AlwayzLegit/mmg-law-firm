import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Promptly surface scheduled blog posts. A post is "scheduled" when it's marked
 * published with a future `published_at`; the public queries already gate on
 * `published_at <= now()`, so it stays hidden until its time — but with ISR it
 * would only appear on the next revalidation (up to 24h late). This cron runs
 * hourly and revalidates the blog index + any post that came due in the last
 * window, so scheduled posts go live within the hour. CRON_SECRET-authorized.
 */
async function handle(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: "cron-not-configured" },
      { status: 503 },
    );
  }
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  const query = new URL(request.url).searchParams.get("secret");
  if (!safeEqual(bearer ?? query ?? "", env.CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  // Posts that became live within the last ~2 hours (covers an hourly cron with
  // margin for a missed run).
  const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("blog_posts")
    .select("slug, published_at")
    .eq("is_published", true)
    .gte("published_at", sinceIso)
    .lte("published_at", nowIso);

  const due = data ?? [];
  if (due.length > 0) {
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    for (const p of due) {
      if (p.slug) revalidatePath(`/blog/${p.slug}`);
    }
  }

  return NextResponse.json({ ok: true, revalidated: due.length });
}

export const GET = handle;
export const POST = handle;
