import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { TopicData } from "./schemas";

/**
 * Topic-queue helpers shared by the API routes and the admin UI (import /
 * seed). Resolves slugs to ids, de-duplicates on lower(keyword), inserts.
 */

export type TopicInsertRow = {
  keyword: string;
  intent: string;
  practice_area_id: string | null;
  county_id: string | null;
  city_id: string | null;
  target_url: string | null;
  title_hint: string | null;
  priority: number;
  volume: number | null;
  kd: number | null;
  cpc: number | null;
  notes: string | null;
  source: string;
  created_by: string | null;
};

export type ResolveFailure = { keyword: string; reason: string };

type Lookup = { id: string; slug: string };

async function lookupBySlug(
  supabase: SupabaseClient,
  table: "practice_areas" | "counties" | "cities",
  slugs: Set<string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (slugs.size === 0) return map;
  const { data } = await supabase.from(table).select("id, slug").in("slug", [...slugs]);
  for (const r of (data ?? []) as Lookup[]) map.set(r.slug, r.id);
  return map;
}

/**
 * Turn validated payloads into insertable rows. Unknown slugs fail that
 * topic (never silently drop the reference).
 */
export async function resolveTopics(
  supabase: SupabaseClient,
  topics: TopicData[],
  defaults: { source: string; priority: number; createdBy: string | null },
): Promise<{ rows: TopicInsertRow[]; failed: ResolveFailure[] }> {
  const paSlugs = new Set<string>();
  const coSlugs = new Set<string>();
  const ciSlugs = new Set<string>();
  for (const t of topics) {
    if (t.practice_area_slug) paSlugs.add(t.practice_area_slug);
    if (t.county_slug) coSlugs.add(t.county_slug);
    if (t.city_slug) ciSlugs.add(t.city_slug);
  }
  const [pa, co, ci] = await Promise.all([
    lookupBySlug(supabase, "practice_areas", paSlugs),
    lookupBySlug(supabase, "counties", coSlugs),
    lookupBySlug(supabase, "cities", ciSlugs),
  ]);

  const rows: TopicInsertRow[] = [];
  const failed: ResolveFailure[] = [];
  for (const t of topics) {
    const paId = t.practice_area_id ?? (t.practice_area_slug ? pa.get(t.practice_area_slug) : null);
    const coId = t.county_id ?? (t.county_slug ? co.get(t.county_slug) : null);
    const ciId = t.city_id ?? (t.city_slug ? ci.get(t.city_slug) : null);
    if (t.practice_area_slug && !paId) {
      failed.push({ keyword: t.keyword, reason: `unknown practice_area_slug "${t.practice_area_slug}"` });
      continue;
    }
    if (t.county_slug && !coId) {
      failed.push({ keyword: t.keyword, reason: `unknown county_slug "${t.county_slug}"` });
      continue;
    }
    if (t.city_slug && !ciId) {
      failed.push({ keyword: t.keyword, reason: `unknown city_slug "${t.city_slug}"` });
      continue;
    }
    rows.push({
      keyword: t.keyword.trim(),
      intent: t.intent,
      practice_area_id: paId ?? null,
      county_id: coId ?? null,
      city_id: ciId ?? null,
      target_url: t.target_url ?? null,
      title_hint: t.title_hint ?? null,
      priority: t.priority ?? defaults.priority,
      volume: t.volume ?? null,
      kd: t.kd ?? null,
      cpc: t.cpc ?? null,
      notes: t.notes ?? null,
      source: t.source ?? defaults.source,
      created_by: defaults.createdBy,
    });
  }
  return { rows, failed };
}

export type InsertOutcome = {
  inserted: Array<Record<string, unknown>>;
  updated: Array<Record<string, unknown>>;
  skipped: Array<{ keyword: string; reason: string }>;
};

/** Insert rows one at a time (small batches) so a duplicate never aborts the rest. */
export async function insertTopics(
  supabase: SupabaseClient,
  rows: TopicInsertRow[],
  opts: { upsert: boolean; select?: string },
): Promise<InsertOutcome> {
  const out: InsertOutcome = { inserted: [], updated: [], skipped: [] };
  const select = opts.select ?? "*";
  for (const row of rows) {
    const { data: existing } = await supabase
      .from("content_topics")
      .select("id, status")
      .ilike("keyword", row.keyword)
      .maybeSingle();
    if (existing) {
      if (!opts.upsert) {
        out.skipped.push({ keyword: row.keyword, reason: "duplicate" });
        continue;
      }
      // Never clobber a topic already in flight or finished.
      const ex = existing as { id: string; status: string };
      if (!["queued", "skipped", "rejected"].includes(ex.status)) {
        out.skipped.push({ keyword: row.keyword, reason: `exists with status ${ex.status}` });
        continue;
      }
      const { created_by: _cb, ...patch } = row;
      void _cb;
      const { data, error } = await supabase
        .from("content_topics")
        .update({ ...patch, status: "queued" })
        .eq("id", ex.id)
        .select(select)
        .single();
      if (error) out.skipped.push({ keyword: row.keyword, reason: error.message });
      else out.updated.push(data as unknown as Record<string, unknown>);
      continue;
    }
    const { data, error } = await supabase
      .from("content_topics")
      .insert(row)
      .select(select)
      .single();
    if (error) {
      out.skipped.push({
        keyword: row.keyword,
        reason: error.code === "23505" ? "duplicate" : error.message,
      });
    } else out.inserted.push(data as unknown as Record<string, unknown>);
  }
  return out;
}
