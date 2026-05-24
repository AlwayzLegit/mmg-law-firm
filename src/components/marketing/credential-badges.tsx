import { Award, GraduationCap, Languages, Scale, ShieldCheck } from "lucide-react";

import type { AttorneyProfile } from "@/lib/data/attorney";
import { firmSameAs, type FirmSettings } from "@/lib/data/firm-settings";
import { cn } from "@/lib/utils";

type Props = {
  profile: AttorneyProfile;
  /** Used to detect whether to surface a "Super Lawyers" badge. */
  firm: FirmSettings;
  className?: string;
};

/**
 * Visual badge grid on the attorney bio page. Shows the structured facts
 * from `attorney_profiles` as compact cards: bar admission, law school,
 * languages, and any bar associations the attorney belongs to.
 *
 * Hides entirely if the profile has no badges to show (i.e. only a name
 * and bar number are set). The bio body's existing "Bar admissions /
 * Education / Bar associations" sections still render the same data in
 * list form — the badge grid is the visual entry point.
 */
export function CredentialBadges({ profile, firm, className }: Props) {
  const badges: Badge[] = buildBadges(profile, firm);
  if (badges.length === 0) return null;

  return (
    <section className={cn("container-page py-10 md:py-12", className)}>
      <ul
        className={cn(
          "grid gap-3",
          "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {badges.map((b) => (
          <li
            key={b.label}
            className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4"
          >
            <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
              <b.icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {b.label}
              </p>
              <p className="mt-0.5 truncate text-sm font-medium">
                {b.value}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Badge = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

function buildBadges(profile: AttorneyProfile, firm: FirmSettings): Badge[] {
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
      value: profile.law_school_year
        ? `${profile.law_school}, ${profile.law_school_year}`
        : profile.law_school,
      icon: GraduationCap,
    });
  }

  if (profile.languages.length > 0) {
    badges.push({
      label: "Languages",
      value: profile.languages.join(", "),
      icon: Languages,
    });
  }

  // Surface the first bar association as a badge if any. Full list still
  // appears in the bio body's "Bar associations" section.
  if (profile.bar_associations.length > 0) {
    const primary = profile.bar_associations[0];
    badges.push({
      label:
        profile.bar_associations.length > 1
          ? "Bar associations"
          : "Bar association",
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
    badges.push({
      label: "Recognition",
      value: "Super Lawyers profile",
      icon: ShieldCheck,
    });
  }

  return badges;
}
