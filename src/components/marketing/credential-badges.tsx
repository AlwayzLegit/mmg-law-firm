import { Award, GraduationCap, Languages, Scale, ShieldCheck } from "lucide-react";

import type { AttorneyProfile } from "@/lib/data/attorney";
import { firmSameAs, type FirmSettings } from "@/lib/data/firm-settings";
import { cn } from "@/lib/utils";

import { IconTile } from "./primitives/icon-tile";

type Props = {
  profile: AttorneyProfile;
  /** Used to detect whether to surface a "Super Lawyers" badge. */
  firm: FirmSettings;
  className?: string;
};

/**
 * Credential cards on the attorney bio page: the structured facts from
 * `attorney_profiles` as white cards (micro-label + Newsreader value).
 *
 * Hides entirely if the profile has no badges to show (i.e. only a name
 * and bar number are set). The bio body's "Bar admissions / Education /
 * Bar associations" sections still render the same data in list form.
 */
export function CredentialBadges({ profile, firm, className }: Props) {
  const badges: Badge[] = buildBadges(profile, firm);
  if (badges.length === 0) return null;

  return (
    <ul className={cn("m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3 p-0", className)}>
      {badges.map((b) => (
        <li key={b.label} className="bg-card border-line rounded-[14px] border p-5">
          <IconTile size="md" tone="gold">
            <b.icon aria-hidden />
          </IconTile>
          <p className="micro-label text-stone m-0 mt-3.5">{b.label}</p>
          <p className="font-display m-0 mt-1.5 text-[19px] leading-[1.2] font-semibold">{b.value}</p>
        </li>
      ))}
    </ul>
  );
}

export type Badge = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

export function buildBadges(profile: AttorneyProfile, firm: FirmSettings): Badge[] {
  const badges: Badge[] = [];

  // Bar admission card always shown when bar_number is set (it always is —
  // it's required to publish).
  if (profile.bar_number) {
    badges.push({
      label: `${profile.bar_state} State Bar`,
      value: `#${profile.bar_number}`,
      icon: Scale,
    });
  }

  if (profile.law_school) {
    badges.push({
      label: "Juris Doctor",
      value: profile.law_school_year ? `${profile.law_school}, ${profile.law_school_year}` : profile.law_school,
      icon: GraduationCap,
    });
  }

  if (profile.languages.length > 0) {
    badges.push({ label: "Languages", value: `Counsel in ${profile.languages.join(", ")}`, icon: Languages });
  }

  badges.push({ label: "Practice", value: "Personal injury & employment law", icon: Award });

  // Surface the first bar association as a badge if any. Full list still
  // appears in the bio body's "Bar associations" section.
  if (profile.bar_associations.length > 0) {
    const primary = profile.bar_associations[0];
    badges.push({
      label: profile.bar_associations.length > 1 ? "Bar associations" : "Bar association",
      value:
        profile.bar_associations.length > 1
          ? `${primary} + ${profile.bar_associations.length - 1} more`
          : primary,
      icon: Award,
    });
  }

  // Super Lawyers badge if the firm has the profile URL set.
  const sameAs = firmSameAs(firm);
  if (sameAs.some((u) => /superlawyers/i.test(u))) {
    badges.push({ label: "Recognition", value: "Super Lawyers profile", icon: ShieldCheck });
  }

  return badges;
}
