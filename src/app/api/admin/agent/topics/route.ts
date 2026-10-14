import "server-only";

import { authenticateApi, clampInt, json, parseJsonBody } from "@/lib/api/auth";
import { logApiAudit } from "@/lib/api/blog";
import { withIdempotency } from "@/lib/api/idempotency";
import { TOPIC_SELECT } from "@/lib/content-agent/brief";
import { TopicInput, TopicsCreateInput } from "@/lib/content-agent/schemas";
import { insertTopics, resolveTopics } from "@/lib/content-agent/topics";
import { getServiceSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/agent/topics — list the queue.
 * Query: status, q (keyword contains), limit (≤200, default 50), offset.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:read"]);
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 1, 200, 50);
  const offset = clampInt(url.searchParams.get("offset"), 0, 1e9, 0);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") ?? "").trim().replace(/[%,()]/g, "");

  const supabase = getServiceSupabase();
  let query = supabase
    .from("content_topics")
    .select(`${TOPIC_SELECT}, source, post_id, claimed_by_run_id, claimed_at, created_at, updated_at`, {
      count: "exact",
    })
    .order("status")
    .order("priority")
    .order("created_at")
    .range(offset, offset + limit - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("keyword", `%${q}%`);
  const { data, error, count } = await query;
  if (error) return json(500, { error: error.message });
  return json(200, { topics: data ?? [], count: count ?? 0, limit, offset });
}

/**
 * POST /api/admin/agent/topics — add topics. Body is one topic object or
 * `{ topics: [...], upsert?: boolean }`. Slugs (practice_area_slug,
 * county_slug, city_slug) or ids are accepted. Agent-sourced topics land
 * behind owner-set ones (priority 70). Idempotent with Idempotency-Key.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await authenticateApi(req, ["agent:write"]);
  if (!auth.ok) return auth.response;
  const raw = await req.text();
  return withIdempotency(req, auth.principal, raw, async () => {
    const body = parseJsonBody(raw);
    if (!body.ok) return body.response;
    const normalized =
      body.body && typeof body.body === "object" && "topics" in (body.body as object)
        ? body.body
        : { topics: [body.body] };
    const parsed = TopicsCreateInput.safeParse(normalized);
    if (!parsed.success) {
      const single = TopicInput.safeParse(body.body);
      return json(422, {
        error: "Validation failed.",
        issues: (single.success ? parsed : single).error?.flatten() ?? parsed.error.flatten(),
      });
    }

    const supabase = getServiceSupabase();
    const { rows, failed } = await resolveTopics(supabase, parsed.data.topics, {
      source: auth.principal.kind === "legacy" ? "import" : "agent",
      priority: 70,
      createdBy: null,
    });
    const outcome = await insertTopics(supabase, rows, {
      upsert: parsed.data.upsert,
      select: TOPIC_SELECT,
    });
    await logApiAudit(
      supabase,
      {
        entity: "content_topics",
        entity_id: null,
        action: "topics_added",
        diff: { inserted: outcome.inserted.length, updated: outcome.updated.length },
      },
      auth.principal,
    );
    return json(201, {
      topics: [...outcome.inserted, ...outcome.updated],
      skipped: [...outcome.skipped, ...failed],
    });
  });
}
