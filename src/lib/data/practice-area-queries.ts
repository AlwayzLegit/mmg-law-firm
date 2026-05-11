/**
 * Editorial content layer for practice areas. The static modules
 * (`practice-areas.ts` for structural data, `practice-area-content.ts` for
 * the editorial defaults) remain canonical for sitemap, lead form, grid,
 * and the dev-without-Supabase fallback. This module overlays per-area
 * content saved through the admin editor on top of those defaults.
 *
 * Public reads return only published rows so unfinished edits stay hidden;
 * admins use a separate path through the supabase server client.
 */

import { findPracticeArea } from "@/lib/data/practice-areas";
import {
  PRACTICE_AREA_CONTENT,
  type PracticeAreaContent,
  type Subtopic,
} from "@/lib/data/practice-area-content";
import type { FaqItem } from "@/lib/data/faqs";
import {
  getStaticSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type PracticeAreaContentRow = {
  intro_md: string | null;
  body_md: string | null;
  subtopics_json: Subtopic[];
  what_to_do_json: string[];
  faq_json: FaqItem[];
  meta_description: string | null;
  is_published: boolean;
};

const SELECT_COLS = `id, slug, name, short_name, intro_md, body_md, subtopics_json, what_to_do_json, faq_json, meta_description, display_order, is_published, updated_at` as const;

/**
 * Resolved content for a practice-area page. DB content takes precedence
 * field-by-field; missing fields fall back to the static module so a
 * partially-edited row still renders coherently.
 */
export type ResolvedPracticeArea = {
  slug: string;
  name: string;
  shortName: string;
  intro: string;
  /** Markdown body. Empty when neither DB nor static seed has long-form copy
   *  for this area. */
  body_md: string;
  /** Whether `body_md` came from the DB (true) or the static fallback (false).
   *  Surfaces tend to render different scaffolding around DB-driven prose. */
  body_from_db: boolean;
  subtopics: Subtopic[];
  process: PracticeAreaContent["process"];
  whatToDo: string[];
  faqs: FaqItem[];
  meta_description: string | null;
};

export async function getPracticeAreaContent(
  slug: string,
): Promise<ResolvedPracticeArea | null> {
  const seed = findPracticeArea(slug);
  if (!seed) return null;
  const staticContent = PRACTICE_AREA_CONTENT[slug];

  let dbRow: PracticeAreaContentRow | null = null;
  if (isSupabaseConfigured()) {
    const supabase = getStaticSupabase();
    const { data, error } = await supabase
      .from("practice_areas")
      .select(SELECT_COLS)
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) {
      console.warn("[practice-areas] content:", error.message);
    } else if (data) {
      dbRow = {
        intro_md: data.intro_md,
        body_md: data.body_md,
        subtopics_json: Array.isArray(data.subtopics_json)
          ? (data.subtopics_json as Subtopic[])
          : [],
        what_to_do_json: Array.isArray(data.what_to_do_json)
          ? (data.what_to_do_json as string[])
          : [],
        faq_json: Array.isArray(data.faq_json)
          ? (data.faq_json as FaqItem[])
          : [],
        meta_description: data.meta_description,
        is_published: data.is_published,
      };
    }
  }

  return resolve(seed, staticContent, dbRow);
}

function resolve(
  seed: { slug: string; name: string; shortName: string; intro: string },
  staticContent: PracticeAreaContent | undefined,
  db: PracticeAreaContentRow | null,
): ResolvedPracticeArea {
  const intro = db?.intro_md?.trim() || seed.intro;
  const dbBody = db?.body_md?.trim() ?? "";
  const body_md = dbBody || staticContent?.body || "";
  const body_from_db = Boolean(dbBody);

  const subtopics =
    db && db.subtopics_json.length > 0
      ? db.subtopics_json
      : (staticContent?.subtopics ?? []);

  const whatToDo =
    db && db.what_to_do_json.length > 0
      ? db.what_to_do_json
      : (staticContent?.whatToDo ?? []);

  const faqs =
    db && db.faq_json.length > 0
      ? db.faq_json
      : (staticContent?.faqs ?? []);

  return {
    slug: seed.slug,
    name: seed.name,
    shortName: seed.shortName,
    intro,
    body_md,
    body_from_db,
    subtopics,
    process: staticContent?.process ?? [],
    whatToDo,
    faqs,
    meta_description: db?.meta_description ?? null,
  };
}
