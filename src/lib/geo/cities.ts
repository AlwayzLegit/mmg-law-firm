import { REGIONS, TIER_1_LOCATIONS } from "@/lib/data/locations";

import type { MapCity } from "./california-map";

/**
 * Coordinates for the Tier-1 cities drawn on the California coverage map.
 * Region names mirror `REGIONS` in lib/data/locations so hovering a region
 * row can highlight its dots. Labels are shown only where the dense LA
 * cluster leaves room.
 */
const COORDS: Record<string, { lat: number; lng: number; label?: boolean; side?: -1 | 1 }> = {
  glendale: { lat: 34.1425, lng: -118.2551, label: true, side: 1 },
  "los-angeles": { lat: 34.0522, lng: -118.2437, label: true, side: -1 },
  burbank: { lat: 34.1808, lng: -118.309, side: -1 },
  pasadena: { lat: 34.1478, lng: -118.1445, side: 1 },
  "long-beach": { lat: 33.7701, lng: -118.1937, label: true, side: -1 },
  "santa-monica": { lat: 34.0195, lng: -118.4912, side: -1 },
  "beverly-hills": { lat: 34.0736, lng: -118.4004, side: -1 },
  anaheim: { lat: 33.8366, lng: -117.9143, label: true, side: 1 },
  "santa-ana": { lat: 33.7455, lng: -117.8677, side: 1 },
  irvine: { lat: 33.6846, lng: -117.8265, label: true, side: 1 },
  riverside: { lat: 33.9806, lng: -117.3755, label: true, side: 1 },
  "san-bernardino": { lat: 34.1083, lng: -117.2898, label: true, side: 1 },
  "san-diego": { lat: 32.7157, lng: -117.1611, label: true, side: 1 },
  bakersfield: { lat: 35.3733, lng: -119.0187, label: true, side: 1 },
  fresno: { lat: 36.7378, lng: -119.7871, label: true, side: 1 },
  sacramento: { lat: 38.5816, lng: -121.4944, label: true, side: 1 },
  "san-francisco": { lat: 37.7749, lng: -122.4194, label: true, side: -1 },
  "san-jose": { lat: 37.3382, lng: -121.8863, label: true, side: 1 },
  oakland: { lat: 37.8044, lng: -122.2712, label: true, side: 1 },
};

const regionOf = new Map<string, string>();
for (const r of REGIONS) for (const c of r.cities) regionOf.set(c.citySlug, r.region);

export const MAP_CITIES: MapCity[] = TIER_1_LOCATIONS.flatMap((c) => {
  const k = COORDS[c.citySlug];
  if (!k) return [];
  return [
    {
      name: c.cityName,
      lat: k.lat,
      lng: k.lng,
      region: regionOf.get(c.citySlug) ?? "",
      hq: c.citySlug === "glendale",
      label: k.label ?? false,
      side: k.side,
    },
  ];
});
