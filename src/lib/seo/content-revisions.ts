import { findPracticeArea } from "@/lib/data/practice-areas";

// Actual UTC date of this approved shared-copy edit, not a build-time clock.
// These revisions supplement DB timestamps because shared template changes
// do not update every location row. Unchanged pages receive no new lastmod.
const ACCIDENT_COPY_REVISION = "2026-10-16";
// Recorded UTC modification time of the separately approved motorcycle-city
// copy. A timestamp distinguishes this edit from the earlier same-day release.
// It is fixed content history, never the build/request clock; the hub is excluded.
export const MOTORCYCLE_CITY_COPY_REVISION = "2026-10-16T04:22:42Z";
const LEGACY_INJURY_HUBS = new Set([
  "bicycle-accidents", "pedestrian-accidents", "slip-and-fall", "dog-bites",
]);

export function sharedContentRevision(path: string): string | undefined {
  if (path === "/resources") return ACCIDENT_COPY_REVISION;
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "locations" && segments.length === 4) {
    if (segments[3] === "motorcycle-accidents") return MOTORCYCLE_CITY_COPY_REVISION;
    const area = findPracticeArea(segments[3]);
    if (area && area.category !== "employment") return ACCIDENT_COPY_REVISION;
  }
  if (segments[0] === "practice-areas" && segments.length === 2 &&
      LEGACY_INJURY_HUBS.has(segments[1])) return ACCIDENT_COPY_REVISION;
  return undefined;
}
