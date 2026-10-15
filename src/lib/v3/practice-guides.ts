import { V3_BY_KEY, type V3PageMeta } from "./pages";

const GUIDE_KEYS: Record<string, readonly string[]> = {
  "car-accidents": ["car", "umuim", "after"],
  "truck-accidents": ["truck", "truckev", "truckliab"],
  "motorcycle-accidents": ["moto", "lanesplit", "motoprop"],
};

/** Use existing published guide labels; never derive or overwrite metadata. */
export function practiceGuides(practice: string): V3PageMeta[] {
  return (GUIDE_KEYS[practice] ?? []).map((key) => V3_BY_KEY[key]);
}
