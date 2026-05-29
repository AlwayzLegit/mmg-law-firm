import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";

import { REGIONS } from "@/lib/data/locations";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

type Props = { className?: string };

export function LocationsList({ className }: Props) {
  return (
    <section
      className={cn(
        "relative border-y border-border/50 bg-secondary/30 py-20 md:py-28",
        className,
      )}
    >
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
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

          {/* Glendale HQ pill — visually anchors the section right side */}
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-2xl border border-[var(--color-gold-500)]/30 bg-card p-5 shadow-sm">
              <span
                aria-hidden
                className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--color-gold-500)]/12 blur-3xl"
              />
              <div className="relative flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold-500)]/15 text-[var(--color-gold-700,#a98442)] ring-1 ring-inset ring-[var(--color-gold-500)]/30">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-gold-700,#a98442)]">
                    Headquarters
                  </p>
                  <p className="mt-0.5 font-display text-lg font-medium tracking-tight">
                    Glendale office
                  </p>
                </div>
              </div>
              <p className="relative mt-3 text-xs leading-relaxed text-muted-foreground">
                {FIRM.address.street}
                <br />
                {FIRM.address.city}, {FIRM.address.state} {FIRM.address.zip}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((region, idx) => (
            <article
              key={region.region}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_-22px_rgba(20,30,80,0.2)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/15 transition-all duration-300 group-hover:from-primary group-hover:to-[var(--color-brand-700,#18298c)] group-hover:text-primary-foreground">
                    <MapPin className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="font-display text-base font-medium tracking-tight">
                    {region.region}
                  </h3>
                </div>
                <span
                  className="font-display text-2xl font-medium tracking-tight text-muted-foreground/25"
                  aria-hidden
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </div>
              <ul className="mt-5 divide-y divide-border/50">
                {region.cities.map((city) => (
                  <li key={city.citySlug}>
                    <Link
                      href={`/locations/${city.countySlug}/${city.citySlug}`}
                      className="group/city flex items-center justify-between py-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      <span>{city.cityName}</span>
                      <ArrowUpRight
                        className="h-3 w-3 opacity-0 transition-all duration-200 group-hover/city:opacity-100 group-hover/city:-translate-y-0.5 group-hover/city:translate-x-0.5"
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
