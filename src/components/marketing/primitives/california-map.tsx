import {
  CA_PATH,
  GRATICULE_PATH,
  MAP_H,
  MAP_W,
  projectCity,
  type MapCity,
} from "@/lib/geo/california-map";
import { cn } from "@/lib/utils";

/**
 * California coverage map — static SVG rendered on the server. Dots carry
 * `data-region` so a sibling list can highlight a region by toggling the
 * `data-hover-region` attribute on a shared ancestor (see RegionHover).
 */
export function CaliforniaMap({
  cities,
  className,
  title = "Map of California cities served",
}: {
  cities: MapCity[];
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${MAP_W} ${MAP_H}`}
      role="img"
      aria-label={title}
      className={cn("ca-map block h-auto w-full", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{title}</title>
      <defs>
        <clipPath id="ca-clip">
          <use href="#ca-shape" />
        </clipPath>
      </defs>
      <path d={GRATICULE_PATH} clipPath="url(#ca-clip)" fill="none" stroke="rgba(245,242,234,.06)" strokeWidth={0.6} />
      <path id="ca-shape" d={CA_PATH} fill="rgba(245,242,234,.035)" stroke="#c9a35a" strokeWidth={1.1} strokeLinejoin="round" />
      <g>
        {cities.map((c) => {
          const { x, y } = projectCity(c);
          const side = c.side ?? 1;
          return (
            <g key={c.name} data-region={c.region} className="ca-city">
              {c.hq ? (
                <circle cx={x} cy={y} r={7} fill="none" stroke="#c9a35a" strokeWidth={1.2} className="animate-pulse-ring origin-center motion-reduce:animate-none" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
              ) : null}
              <circle
                cx={x}
                cy={y}
                r={c.hq ? 5 : 3.5}
                fill="#c9a35a"
                stroke="#0f1115"
                strokeWidth={1.5}
                className="ca-dot transition-[opacity,r] duration-200"
              />
              <text
                x={x + side * 9}
                y={y + 4}
                textAnchor={side < 0 ? "end" : "start"}
                className={cn("ca-label fill-cream/72 text-[11px] font-medium tracking-[0.02em] transition-opacity duration-200", !c.label && "opacity-0")}
                style={{ fontFamily: "var(--font-sans)" }}
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
