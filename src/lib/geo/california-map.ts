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
const path = geoPath(projection);

export const CA_PATH = path(ca) ?? "";
export const GRATICULE_PATH = path(geoGraticule().step([2, 2])()) ?? "";

export function projectCity(c: MapCity): { x: number; y: number } {
  const p = projection([c.lng, c.lat]);
  return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 };
}
