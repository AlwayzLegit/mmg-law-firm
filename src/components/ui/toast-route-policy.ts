// These three v3 hubs use inline form feedback and have no toast producers.
// Keep every other route (including city forms, blog sharing and admin) enabled.
// The dependency-graph test fails if a toast producer is added to a hub later.
const INLINE_FEEDBACK_HUBS = new Set([
  "/practice-areas/car-accidents",
  "/practice-areas/truck-accidents",
  "/practice-areas/motorcycle-accidents",
]);

export function needsToastHost(pathname: string | null): boolean {
  return pathname === null || !INLINE_FEEDBACK_HUBS.has(pathname);
}
