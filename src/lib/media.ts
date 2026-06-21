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
// Each role maps to a DISTINCT photo so no two surfaces repeat the same image.
// Served through next/image, so Vercel resizes + re-encodes to AVIF/WebP.
export const ATTORNEY_IMAGES = {
  /** Homepage hero card (priority/LCP). ~5.1 MB. */
  portrait: "Male_attorney_from_reference_p_Nano_Banana_Pro_35884.png",
  /** Homepage "Meet" bio card. ~5.8 MB. */
  portraitAlt: "Male_attorney_from_reference_p_Nano_Banana_Pro_30573.png",
  /** Practice-areas index hero aside. ~5 MB. */
  portraitAside: "Male_attorney_from_reference_p_Nano_Banana_Pro_75933.png",
  /** Attorney bio "in chambers" editorial band. */
  standing: "A_polished_attorney_standing_n_Nano_Banana_2_31880.png",
  /** Homepage "How we work" consultation scene. */
  meeting: "A_confident_lawyer_meeting_wit_Nano_Banana_2_13791.png",
  /** Contact-page hero aside. ~5.2 MB. */
  contact: "Male_attorney_from_reference_p_Nano_Banana_Pro_42793.png",
  /** Practice-area detail hero asides. ~5.2 MB. */
  practiceDetail: "Male_attorney_from_reference_p_Nano_Banana_Pro_14047.png",
  /** Locations index hero aside — candid scene. */
  locationsIndex: "Candid_professional_photo_of_a_Nano_Banana_2_64768.png",
  /** County page hero aside — close-up scene. */
  county: "Close-up_of_male_attorney_from_Nano_Banana_2_12711.png",
  /** City page hero aside — scene. */
  city: "Male_attorney_from_reference_p_Nano_Banana_2_15827.png",
  /** City × practice page hero aside — portrait. */
  cityPractice: "Male_attorney_from_reference_p_Nano_Banana_Pro_11233.png",
  /** Reviews page hero aside — portrait. */
  reviews: "Male_attorney_from_reference_p_Nano_Banana_Pro_20851.png",
  /** Blog index hero aside — portrait. */
  blog: "Male_attorney_from_reference_p_Nano_Banana_Pro_69288.png",
  /** Case-results page hero aside — portrait. */
  caseResults: "Male_attorney_from_reference_p_Nano_Banana_Pro_71333.png",
} as const;

/** Absolute public URL for the lead attorney's headshot (used to seed the DB). */
export const ATTORNEY_HEADSHOT_URL = mediaUrl(ATTORNEY_IMAGES.portrait);
