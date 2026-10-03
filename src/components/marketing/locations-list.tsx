import Link from "next/link";
import { MapPin } from "lucide-react";

import { REGIONS } from "@/lib/data/locations";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { MAP_CITIES } from "@/lib/geo/cities";
import { cn } from "@/lib/utils";

import { CaliforniaMap } from "./primitives/california-map";
import { Eyebrow } from "./primitives/eyebrow";
import { RegionHover } from "./primitives/region-hover";
import { Reveal } from "./primitives/reveal";

type Props = { className?: string };

/**
 * "California, end to end" (redesign v2): server-rendered SVG map on the
 * left, HQ chip and six region rows with city links on the right. Hovering a
 * region row highlights its dots (RegionHover toggles classes; CSS does the
 * rest). Region h3s and every city link are unchanged from v1.
 */
export function LocationsList({ className }: Props) {
  return (
    <section id="locations" className={cn("surface-ink bg-background text-foreground", className)}>
      <RegionHover className="container-page section-pad grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-center gap-12">
        <Reveal className="border-cream/8 relative rounded-[18px] border bg-[radial-gradient(ellipse_at_50%_40%,rgba(201,163,90,.08),transparent_70%)] p-4">
          <CaliforniaMap cities={MAP_CITIES} title={`Map of California cities served by ${FIRM.legalName}`} />
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Statewide</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-display text-cream mt-3.5 font-semibold">California, end to end.</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-cream/70 mt-3.5 max-w-[56ch] text-base">
              Headquartered in Glendale, we represent clients across the state.
              Below are the cities we work most actively in — but if you don&apos;t
              see yours, we likely cover it too. Call us to confirm.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <div className="bg-gold/10 border-gold/30 mt-6 flex items-center gap-3.5 rounded-xl border px-4 py-3.5">
              <span className="bg-gold text-ink inline-flex h-10 w-10 flex-none items-center justify-center rounded-full">
                <MapPin className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <div>
                <p className="text-gold m-0 text-[10px] font-semibold tracking-[0.16em] uppercase">
                  Headquarters · Glendale office
                </p>
                <p className="text-cream m-0 mt-0.5 text-[14.5px]">{FIRM_FULL_ADDRESS}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <ul className="border-cream/12 m-0 mt-5 list-none border-t p-0" data-region-source>
              {REGIONS.map((region, idx) => (
                <li
                  key={region.region}
                  data-region={region.region}
                  className="region-row border-cream/12 -mx-2.5 grid grid-cols-[36px_1fr] items-baseline gap-3 rounded-lg border-b px-2.5 py-[13px] transition-colors"
                >
                  <span className="text-gold text-[11px] tracking-[0.1em] tabular-nums">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5">
                    <h3 className="font-display text-cream m-0 text-xl font-semibold">{region.region}</h3>
                    <span className="text-cream/60 flex flex-wrap gap-x-2.5 gap-y-1 text-[13px]">
                      {region.cities.map((city) => (
                        <Link
                          key={city.citySlug}
                          href={`/locations/${city.countySlug}/${city.citySlug}`}
                          className="hover:text-cream text-inherit no-underline transition-colors"
                        >
                          {city.cityName}
                        </Link>
                      ))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </RegionHover>
    </section>
  );
}
