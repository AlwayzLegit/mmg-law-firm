import fs from "node:fs";
import path from "node:path";

/**
 * Server-side check for whether a brand image has been committed to
 * /public/{p}. Used to gate optional editorial sections so the layout
 * collapses cleanly when an image isn't yet on disk, instead of
 * rendering a broken <img> or an empty grid column.
 *
 * Paths are relative to /public, with a leading slash, exactly as you'd
 * pass them to next/image — e.g. "/brand/consultation.webp".
 */
export function publicAssetExists(p: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", p));
  } catch {
    return false;
  }
}
