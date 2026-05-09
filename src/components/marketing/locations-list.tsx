import Link from "next/link";
import { MapPin } from "lucide-react";

import { REGIONS } from "@/lib/data/locations";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export function LocationsList({ className }: Props) {
  return (
    <section className={cn("container-page py-16 md:py-24", className)}>
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Statewide
        </p>
        <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
          California, end to end.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Headquartered in Glendale, we represent clients across the state.
          Below are the cities we work most actively in — but if you don&apos;t
          see yours, we likely cover it too. Call us to confirm.
        </p>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {REGIONS.map((region) => (
          <div
            key={region.region}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2">
              <MapPin
                className="h-4 w-4 flex-none text-primary"
                aria-hidden
              />
              <h3 className="font-display text-base font-medium">
                {region.region}
              </h3>
            </div>
            <ul className="mt-4 grid gap-2">
              {region.cities.map((city) => (
                <li key={city.citySlug}>
                  <Link
                    href={`/locations/${city.countySlug}/${city.citySlug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {city.cityName}
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
