/**
 * Read layer for the four legal pages. DB row wins when published; otherwise
 * we render the in-code fallback in src/lib/data/legal-pages.ts so the public
 * URLs never go dark.
 */

import {
  LEGAL_PAGE_FALLBACKS,
  type LegalPageFallback,
  type LegalPageSlug,
} from "@/lib/data/legal-pages";
import {
  getStaticSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export type ResolvedLegalPage = {
  slug: LegalPageSlug;
  title: string;
  subtitle: string | null;
  body_md: string;
  meta_description: string;
  effective_date: string | null;
  last_reviewed_at: string | null;
  /** Whether the rendered content came from the DB (true) or the in-code
   *  fallback (false). Surfaces use this to decide whether to show
   *  "Last reviewed" / "Effective" lines. */
  from_db: boolean;
};

const SELECT_COLS = `id, slug, title, subtitle, body_md, meta_description, effective_date, last_reviewed_at, is_published, display_order, updated_at` as const;

export async function getLegalPage(
  slug: LegalPageSlug,
): Promise<ResolvedLegalPage> {
  const fallback = LEGAL_PAGE_FALLBACKS[slug];

  if (!isSupabaseConfigured()) return fromFallback(fallback);

  const supabase = getStaticSupabase();
  const { data, error } = await supabase
    .from("legal_pages")
    .select(SELECT_COLS)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.warn("[legal] page:", error.message);
    return fromFallback(fallback);
  }
  if (!data) return fromFallback(fallback);

  // A published row with an empty body still falls through to fallback —
  // a publish gate enforces this, but we double-check at read time.
  if (!data.body_md || data.body_md.trim() === "") {
    return fromFallback(fallback);
  }

  return {
    slug,
    title: data.title,
    subtitle: data.subtitle,
    body_md: data.body_md,
    meta_description: data.meta_description ?? fallback.meta_description,
    effective_date: data.effective_date,
    last_reviewed_at: data.last_reviewed_at,
    from_db: true,
  };
}

function fromFallback(f: LegalPageFallback): ResolvedLegalPage {
  return {
    slug: f.slug,
    title: f.title,
    subtitle: f.subtitle,
    body_md: f.body_md,
    meta_description: f.meta_description,
    effective_date: null,
    last_reviewed_at: null,
    from_db: false,
  };
}
