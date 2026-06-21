/**
 * Helpers for images stored in the public Supabase `media` bucket.
 *
 * Images are referenced by their object name and served through `next/image`,
 * so on Vercel they're resized and re-encoded to AVIF/WebP on the fly (see
 * `images.formats` in next.config) — no need to commit per-size WebP copies.
 * `remotePatterns` already allow the `*.supabase.co/storage/v1/object/public/**`
 * path.
 */

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/** Public URL for an object in the `media` bucket. */
export function mediaUrl(objectName: string): string {
  return `${BASE}/storage/v1/object/public/media/${encodeURIComponent(objectName)}`;
}

/**
 * Curated attorney imagery (owner-provided photos of Mihran in the media
 * bucket). Priority/LCP slots use the lighter ~5–6 MB portraits; the heavier
 * scene shots are reserved for lazy, below-the-fold editorial sections.
 */
export const ATTORNEY_IMAGES = {
  /** Tight portrait — hero card + attorney headshot (priority). ~6 MB. */
  portrait: "Male_attorney_from_reference_p_Nano_Banana_Pro_39202.png",
  /** Second portrait — bio card, for variety. ~5.8 MB. */
  portraitAlt: "Male_attorney_from_reference_p_Nano_Banana_Pro_30573.png",
  /** Portrait for the practice-areas aside (priority). ~5 MB. */
  portraitAside: "Male_attorney_from_reference_p_Nano_Banana_Pro_75933.png",
  /** Standing editorial shot — attorney bio "in chambers" band. */
  standing: "A_polished_attorney_standing_n_Nano_Banana_2_31880.png",
  /** Consultation/meeting scene — homepage "How we work". */
  meeting: "A_confident_lawyer_meeting_wit_Nano_Banana_2_13791.png",
} as const;

/** Absolute public URL for the lead attorney's headshot (used to seed the DB). */
export const ATTORNEY_HEADSHOT_URL = mediaUrl(ATTORNEY_IMAGES.portrait);
