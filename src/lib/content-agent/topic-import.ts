/**
 * Parse pasted topic lists (admin import). Two formats:
 *
 *  1. Markdown table — the `docs/seo-keyword-targets.md` layout:
 *     | Keyword | Vol | KD | CPC | Practice area | Build as |
 *  2. CSV with a header row; recognised columns (case-insensitive):
 *     keyword, intent, practice_area (slug), county (slug), city (slug),
 *     target_url, priority, volume, kd, cpc, notes
 *
 * Pure — no I/O — so it's unit-testable.
 */

export type ParsedTopic = {
  keyword: string;
  intent?: string;
  practice_area_slug?: string;
  county_slug?: string;
  city_slug?: string;
  target_url?: string;
  priority?: number;
  volume?: number;
  kd?: number;
  cpc?: number;
  notes?: string;
};

const INTENTS = new Set(["informational", "supporting_post", "local", "faq", "news", "comparison"]);

function num(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const cleaned = v.replace(/\*\*/g, "").replace(/[$,]/g, "").trim();
  // "17 / 22" or "17–32" → first number
  const m = /-?\d+(\.\d+)?/.exec(cleaned);
  return m ? Number(m[0]) : undefined;
}

function clean(v: string | undefined): string | undefined {
  const s = (v ?? "").replace(/\*\*/g, "").trim();
  return s && s !== "—" && s !== "-" ? s : undefined;
}

/** Pull a practice-area slug out of free text like "car-accidents (symptom intent)". */
function slugIn(v: string | undefined): string | undefined {
  const s = clean(v);
  if (!s) return undefined;
  const m = /[a-z0-9]+(?:-[a-z0-9]+)+/.exec(s);
  return m ? m[0] : undefined;
}

export function parseTopicsText(text: string): { topics: ParsedTopic[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  const topics: ParsedTopic[] = [];
  if (lines.length === 0) return { topics, errors: ["Nothing to import."] };

  const isMd = lines.some((l) => l.startsWith("|"));
  if (isMd) {
    const rows = lines.filter((l) => l.startsWith("|"));
    let header: string[] | null = null;
    for (const line of rows) {
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator
      if (!header) {
        header = cells.map((c) => c.toLowerCase());
        continue;
      }
      const get = (name: RegExp) => {
        const i = header!.findIndex((h) => name.test(h));
        return i >= 0 ? cells[i] : undefined;
      };
      const kwRaw = clean(get(/^keyword/));
      if (!kwRaw) {
        errors.push(`Skipped row without keyword: ${line.slice(0, 60)}`);
        continue;
      }
      // "a / b" keyword cells carry two keywords → two topics.
      const keywords = kwRaw.split(" / ").map((k) => k.trim()).filter(Boolean);
      const vol = num(get(/^vol/));
      const kd = num(get(/^kd/));
      const cpc = num(get(/^cpc/));
      const pa = slugIn(get(/practice/));
      const build = clean(get(/build/));
      for (const keyword of keywords) {
        topics.push({
          keyword,
          intent: "supporting_post",
          practice_area_slug: pa,
          volume: vol,
          kd,
          cpc,
          notes: build ? `Build as: ${build}` : undefined,
        });
      }
    }
    if (!header) errors.push("No table header row found.");
    return { topics, errors };
  }

  // CSV
  const header = splitCsv(lines[0]).map((h) => h.trim().toLowerCase());
  if (!header.includes("keyword")) {
    return { topics, errors: ["CSV must have a header row with a 'keyword' column."] };
  }
  for (const line of lines.slice(1)) {
    const cells = splitCsv(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    const keyword = clean(row.keyword);
    if (!keyword) {
      errors.push(`Skipped row without keyword: ${line.slice(0, 60)}`);
      continue;
    }
    const intent = clean(row.intent);
    if (intent && !INTENTS.has(intent)) errors.push(`Unknown intent "${intent}" for "${keyword}" — defaulted.`);
    topics.push({
      keyword,
      intent: intent && INTENTS.has(intent) ? intent : undefined,
      practice_area_slug: clean(row.practice_area ?? row.practice_area_slug),
      county_slug: clean(row.county ?? row.county_slug),
      city_slug: clean(row.city ?? row.city_slug),
      target_url: clean(row.target_url),
      priority: num(row.priority),
      volume: num(row.volume ?? row.vol),
      kd: num(row.kd),
      cpc: num(row.cpc),
      notes: clean(row.notes),
    });
  }
  return { topics, errors };
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}
