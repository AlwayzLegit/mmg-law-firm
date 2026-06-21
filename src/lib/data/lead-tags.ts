import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { tagCounts } from "@/lib/leads/tags";

/**
 * The firm's existing lead-tag vocabulary, most-used first. Powers tag
 * autocomplete on the lead detail editor and the bulk-tag bar so admins
 * reuse existing tags instead of spawning typo variants. Spam excluded.
 */
export async function getTagVocabulary(
  supabase: SupabaseClient,
  limit = 50,
): Promise<string[]> {
  const { data } = await supabase
    .from("leads")
    .select("tags")
    .neq("status", "spam")
    .limit(5000);

  return tagCounts((data ?? []).map((r) => r.tags as string[] | null))
    .slice(0, limit)
    .map((t) => t.tag);
}
