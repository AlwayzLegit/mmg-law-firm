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
