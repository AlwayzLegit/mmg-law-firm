import {
  Ban,
  Bike,
  Brain,
  Briefcase,
  Car,
  CircleDot,
  Coins,
  Dog,
  HeartCrack,
  PersonStanding,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  Truck,
  UserX,
  type LucideIcon,
} from "lucide-react";

/**
 * Explicit registry of the icons practice areas reference by name
 * (`PRACTICE_AREAS[].icon`). A named map keeps the client bundle small —
 * `import * as Icons` would pull the whole Lucide library into every chunk.
 */
const ICONS: Record<string, LucideIcon> = {
  Ban,
  Bike,
  BikeIcon: Bike,
  Brain,
  Briefcase,
  Car,
  Coins,
  Dog,
  HeartCrack,
  PersonStanding,
  ShieldAlert,
  Smartphone,
  TriangleAlert,
  Truck,
  UserX,
};

/** Look up a Lucide icon by name, falling back to a generic shape if missing. */
export function resolveIcon(name: string): LucideIcon {
  return ICONS[name] ?? CircleDot;
}
