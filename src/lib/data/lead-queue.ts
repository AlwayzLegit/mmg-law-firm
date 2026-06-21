import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeSearchTerm, slugish } from "@/lib/search";

/**
 * Filter context for the leads list, parsed from a querystring. Mirrors the
 * filters the list page applies so the lead-detail prev/next can reconstruct
 * the same ordered queue.
 */
export type LeadFilters = {
  status: string;
  due: boolean;
  q: string;
  source: string;
  pa: string;
  county: string;
  assignee: "all" | "me" | "unassigned";
  tag: string;
};

const STATUSES = new Set([
  "new",
  "contacted",
  "qualified",
  "signed",
  "rejected",
  "spam",
]);
const CLOSED = ["signed", "rejected", "spam"];
// Cap the navigable queue; deep pagination past this is an edge case.
const QUEUE_CAP = 1000;

export function parseLeadFilters(sp: URLSearchParams): LeadFilters {
  const status = sp.get("status") ?? "all";
  const assignee = sp.get("assignee") ?? "all";
  return {
    status: STATUSES.has(status) ? status : "all",
    due: sp.get("due") === "1",
    q: sanitizeSearchTerm(sp.get("q") ?? ""),
    source: slugish(sp.get("source") ?? undefined),
    pa: slugish(sp.get("pa") ?? undefined),
    county: slugish(sp.get("county") ?? undefined),
    assignee: assignee === "me" || assignee === "unassigned" ? assignee : "all",
    tag: (sp.get("tag") ?? "").trim().toLowerCase().slice(0, 30),
  };
}

/**
 * The ordered list of lead ids matching `filters`, in the same order the list
 * page shows them. Used to compute prev/next neighbors on the detail page.
 */
export async function getLeadQueueIds(
  supabase: SupabaseClient,
  filters: LeadFilters,
  userId: string,
): Promise<string[]> {
  let paId: string | null = null;
  if (filters.pa) {
    const { data } = await supabase
      .from("practice_areas")
      .select("id")
      .eq("slug", filters.pa)
      .maybeSingle();
    paId = (data?.id as string | undefined) ?? null;
  }
  let countyId: string | null = null;
  if (filters.county) {
    const { data } = await supabase
      .from("counties")
      .select("id")
      .eq("slug", filters.county)
      .maybeSingle();
    countyId = (data?.id as string | undefined) ?? null;
  }

  let query = supabase
    .from("leads")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(QUEUE_CAP);

  if (filters.source) query = query.eq("utm_source", filters.source);
  if (paId) query = query.eq("practice_area_id", paId);
  if (countyId) query = query.eq("county_id", countyId);
  if (filters.tag) query = query.contains("tags", [filters.tag]);
  if (filters.assignee === "me") query = query.eq("assigned_to", userId);
  else if (filters.assignee === "unassigned")
    query = query.is("assigned_to", null);

  if (filters.due) {
    query = query
      .not("follow_up_at", "is", null)
      .lte("follow_up_at", new Date().toISOString())
      .not("status", "in", `(${CLOSED.join(",")})`)
      .order("follow_up_at", { ascending: true });
  } else if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  } else {
    query = query.neq("status", "spam");
  }

  if (filters.q) {
    query = query.or(
      `full_name.ilike.%${filters.q}%,email.ilike.%${filters.q}%,phone.ilike.%${filters.q}%`,
    );
  }

  const { data } = await query;
  return (data ?? []).map((r) => r.id as string);
}

export type LeadNeighbors = {
  prevId: string | null;
  nextId: string | null;
  index: number; // 0-based position, -1 if not found
  total: number;
};

/** Find a lead's neighbors within the filtered queue. */
export function neighborsOf(ids: string[], currentId: string): LeadNeighbors {
  const index = ids.indexOf(currentId);
  return {
    prevId: index > 0 ? ids[index - 1] : null,
    nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
    index,
    total: ids.length,
  };
}
