import { Award, Languages, Phone, Scale } from "lucide-react";

import { FIRM } from "@/lib/constants";
import {
  getFirmStats,
  hasAnyFirmStat,
  type FirmStats,
} from "@/lib/data/firm-settings";
import { cn } from "@/lib/utils";

import { IconTile } from "./primitives/icon-tile";

/**
 * "By the numbers" band between the hero and the recognition block. Pure
 * trust signal — only renders if the attorney has populated firm_settings via
 * /admin/settings/firm.
 *
 * Per spec hard rule #6, nothing is invented. If no stats are populated,
 * the band returns null entirely (no skeleton, no "TBD" placeholders).
 */
export async function HomepageStats({ className }: { className?: string }) {
  const stats = await getFirmStats();
  if (!hasAnyFirmStat(stats)) return null;

  const items = buildItems(stats);
  if (items.length === 0) return null;

  return (
    <section
      className={cn("bg-background text-foreground", className)}
      aria-label="By the numbers"
    >
      <div className="container-page pb-[clamp(40px,6vw,64px)]">
        <ul
          className={cn(
            "surface-ink bg-background text-foreground m-0 grid list-none gap-x-8 gap-y-6 rounded-[18px] px-6 py-8 md:px-10 md:py-10",
            items.length === 1 && "sm:grid-cols-1",
            items.length === 2 && "sm:grid-cols-2",
            items.length === 3 && "sm:grid-cols-3",
            items.length >= 4 && "sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {items.map((it) => (
            <li key={it.label} className="flex flex-col gap-1.5">
              <IconTile size="sm" tone="gold">
                <it.icon aria-hidden />
              </IconTile>
              <p className="font-display text-cream mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {it.value}
              </p>
              <p className="text-cream/60 text-xs font-semibold tracking-[0.18em] uppercase">{it.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type Item = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

function buildItems(stats: FirmStats): Item[] {
  const items: Item[] = [];

  if (stats.years_practicing) {
    items.push({ label: "Years practicing", value: `${stats.years_practicing}+`, icon: Scale });
  }
  if (stats.settlements_total_display) {
    items.push({ label: "Recovered for clients", value: stats.settlements_total_display, icon: Award });
  }
  if (stats.cases_handled_display) {
    items.push({ label: "Cases handled", value: stats.cases_handled_display, icon: Award });
  }
  if (stats.consultations_display) {
    items.push({ label: "Consultations", value: stats.consultations_display, icon: Phone });
  }

  // Languages always shown when the band is rendered — it's a true firm
  // fact carried in src/lib/constants.ts and is not subject to the
  // "attorney verifies" requirement (it's the attorney's own languages
  // already declared in the seed). Skipped only if FIRM.languages is empty.
  if (items.length > 0 && FIRM.languages.length > 0) {
    items.push({ label: "Counsel offered in", value: FIRM.languages.join(", "), icon: Languages });
  }

  return items;
}
