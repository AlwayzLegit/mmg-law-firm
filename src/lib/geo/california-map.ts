import { geoMercator, geoPath, geoGraticule } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

import topo from "./california.json";

/**
 * Server-side projection for the California coverage map. Produces SVG path
 * strings + projected city points so the map renders as static SVG in the
 * server HTML (no runtime fetch, no d3 in the client bundle).
 */
export const MAP_W = 620;
export const MAP_H = 720;

export type MapCity = {
  name: string;
  lat: number;
  lng: number;
  region: string;
  hq?: boolean;
  /** Label visible at default zoom (dense LA cluster collapses). */
  label?: boolean;
  /** Label side: -1 left, 1 right. */
  side?: -1 | 1;
};

const typed = topo as unknown as Topology<{ california: GeometryCollection }>;
const ca = feature(typed, typed.objects.california);
const projection = geoMercator().fitExtent(
  [
    [36, 28],
    [MAP_W - 36, MAP_H - 28],
  ],
  ca,
);
// One decimal place is plenty at 620×720 and roughly halves the path text.
const path = geoPath(projection).digits(1);

export const CA_PATH = path(ca) ?? "";
// Bound the graticule to California's bounding box. The default graticule
// covers the whole globe and alone weighed ~200 KB of inline SVG (duplicated
// again in the RSC payload); clipped to the state it is ~0.5 KB.
export const GRATICULE_PATH =
  path(
    geoGraticule()
      .extent([
        [-125, 32],
        [-113.5, 42.5],
      ])
      .step([2, 2])(),
  ) ?? "";

export function projectCity(c: MapCity): { x: number; y: number } {
  const p = projection([c.lng, c.lat]);
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}
