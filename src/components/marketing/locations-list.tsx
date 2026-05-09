import Link from "next/link";
import { MapPin } from "lucide-react";

import { REGIONS } from "@/lib/data/locations";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

type Props = { className?: string };

export function LocationsList({ className }: Props) {
  return (
    <section className={cn("container-page py-20 md:py-28", className)}>
      <div className="max-w-2xl">
        <SectionEyebrow>Statewide</SectionEyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
          California, end to end.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Headquartered in Glendale, we represent clients across the state.
          Below are the cities we work most actively in — but if you don&apos;t
          see yours, we likely cover it too. Call us to confirm.
        </p>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((region) => (
          <div
            key={region.region}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/30"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
              </span>
              <h3 className="font-display text-base font-medium tracking-tight">
                {region.region}
              </h3>
            </div>
            <ul className="mt-5 grid gap-1.5">
              {region.cities.map((city) => (
                <li key={city.citySlug}>
                  <Link
                    href={`/locations/${city.countySlug}/${city.citySlug}`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <span>{city.cityName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
