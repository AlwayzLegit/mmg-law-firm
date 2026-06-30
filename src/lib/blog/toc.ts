/**
 * Extract a table of contents from a markdown body. Returns one entry per
 * H2/H3 with a GitHub-style slug that matches what `rehype-slug` puts on the
 * rendered heading, so the TOC anchors link to the right headings.
 */

export type TocItem = {
  level: 2 | 3;
  text: string;
  id: string;
};

/** GitHub-flavored slug — mirrors github-slugger / rehype-slug. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "") // strip punctuation but keep unicode letters
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Strip simple inline markdown so the TOC text reads cleanly:
 * `**bold**` / `*em*` / `` `code` `` / `[link](url)` → plain text.
 */
function stripInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function extractToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  const items: TocItem[] = [];
  const seen = new Map<string, number>();
  // Track whether we're inside a fenced code block so `## hashes inside`
  // a code sample don't become TOC entries.
  let inFence = false;
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^\s{0,3}```/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(raw);
    if (!m) continue;
    const level = m[1].length === 2 ? 2 : 3;
    const text = stripInline(m[2]);
    if (!text) continue;
    const base = slugify(text);
    // De-duplicate slugs the way rehype-slug does (`-1`, `-2`, …).
    const n = seen.get(base) ?? 0;
    const id = n === 0 ? base : `${base}-${n}`;
    seen.set(base, n + 1);
    items.push({ level, text, id });
  }
  return items;
}
