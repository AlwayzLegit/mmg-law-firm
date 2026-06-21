/**
 * Normalize a free-text tag list into a clean, de-duplicated set: trimmed,
 * lower-cased, internal whitespace collapsed, empties dropped, capped at 20
 * tags of 30 chars each. Pure — shared by the server action (authoritative
 * normalization) and the tag editor's optimistic update so both agree.
 */
export function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    const clean = t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 20) break;
  }
  return out;
}

export type TagCount = { tag: string; count: number };

/**
 * Aggregate tag usage across many leads' tag arrays into a descending,
 * alphabetically-stable list of {tag, count}. Null/garbage entries are
 * ignored. Pure — used by the tag-management page and unit-tested.
 */
export function tagCounts(
  leadTags: Array<string[] | null | undefined>,
): TagCount[] {
  const tally = new Map<string, number>();
  for (const tags of leadTags) {
    if (!Array.isArray(tags)) continue;
    for (const t of tags) {
      if (typeof t !== "string" || !t) continue;
      tally.set(t, (tally.get(t) ?? 0) + 1);
    }
  }
  return [...tally.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
