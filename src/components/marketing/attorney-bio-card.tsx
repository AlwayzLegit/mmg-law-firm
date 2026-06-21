import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  GraduationCap,
  Languages,
  Scale,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getAttorneyProfile } from "@/lib/data/attorney";
import { FIRM } from "@/lib/constants";
import { ATTORNEY_IMAGES, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

type Props = {
  className?: string;
  /** Attorney slug to feature. Defaults to the firm's lead attorney. */
  slug?: string;
};

const DEFAULT_SLUG = "mihran-ghazaryan";

/** Used when an attorney profile has no headshot_url set in the DB. Points at
 *  the attorney's portrait in the media bucket (optimized by Vercel), so the
 *  homepage "Meet" section never falls back to the gradient initials. */
const DEFAULT_HEADSHOT_URL = mediaUrl(ATTORNEY_IMAGES.portraitAlt);

export async function AttorneyBioCard({
  className,
  slug = DEFAULT_SLUG,
}: Props) {
  const profile = await getAttorneyProfile(slug);
  if (!profile) return null;

  const firstName = profile.display_name ?? profile.full_name.split(" ")[0];
  const initials = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3);

  const headshotUrl = profile.headshot_url ?? DEFAULT_HEADSHOT_URL;

  const lawSchoolLine = profile.law_school
    ? profile.law_school_year
      ? `JD — ${profile.law_school}, ${profile.law_school_year}`
      : `JD — ${profile.law_school}`
    : null;

  return (
    <section className={cn("container-page py-20 md:py-28", className)}>
      <div className="grid gap-10 md:grid-cols-[300px_1fr] md:items-start lg:grid-cols-[360px_1fr] lg:gap-16">
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/30"
          />
          <div className="border-border relative aspect-[4/5] w-full overflow-hidden rounded-2xl border">
            {headshotUrl ? (
              <Image
                src={headshotUrl}
                alt={
                  profile.headshot_alt ??
                  `${profile.full_name}, ${FIRM.legalName}`
                }
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 360px, (min-width: 768px) 300px, 100vw"
                priority={false}
              />
            ) : (
              <>
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(155deg, var(--color-brand-700) 0%, var(--color-brand-500) 60%, var(--color-brand-300) 100%)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.18]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div
                  aria-hidden
                  className="font-display text-primary-foreground/15 absolute inset-0 flex items-center justify-center text-[10rem] font-medium tracking-tighter"
                >
                  {initials}
                </div>
              </>
            )}
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-primary-foreground/80 text-[10px] font-semibold tracking-[0.22em] uppercase">
                  {profile.job_title?.split("&")[0]?.trim() ||
                    "Founding attorney"}
                </p>
                <p className="font-display text-primary-foreground mt-1 text-base font-medium">
                  {profile.full_name}
                </p>
              </div>
              <span className="bg-primary-foreground/15 text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase backdrop-blur">
                CA #{profile.bar_number}
              </span>
            </div>
          </div>
        </div>

        <div>
          <SectionEyebrow>About</SectionEyebrow>
          <h2 className="font-display mt-4 text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Meet {firstName}.
          </h2>

          <div className="text-muted-foreground mt-6 space-y-4">
            {profile.short_bio ? (
              <p className="text-lg leading-relaxed">{profile.short_bio}</p>
            ) : (
              <p className="text-lg leading-relaxed">
                {profile.full_name} founded {FIRM.legalName} to give injured
                Californians an advocate who returns calls, explains every
                option in plain language, and treats each case as if the outcome
                affected his own family — because for the client, it does.
              </p>
            )}
            <p>
              {firstName} is admitted in {profile.bar_state} (Bar No.{" "}
              {profile.bar_number}) and represents clients across the state from
              the firm&apos;s office in {FIRM.address.city}.
              {profile.languages.length > 1 ? (
                <>
                  {" "}
                  The practice is bilingual: matters can be handled in{" "}
                  {profile.languages.join(", ")}.
                </>
              ) : null}
            </p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            <Stat
              icon={Scale}
              label={`${profile.bar_state} Bar #${profile.bar_number}`}
            />
            {profile.languages.length > 0 ? (
              <Stat
                icon={Languages}
                label={`Counsel in ${profile.languages.join(", ")}`}
              />
            ) : null}
            <Stat icon={Award} label="Personal-injury practice exclusively" />
            {lawSchoolLine ? (
              <Stat icon={GraduationCap} label={lawSchoolLine} />
            ) : null}
          </ul>

          <div className="mt-10">
            <Link
              href={`/attorneys/${profile.slug}`}
              className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            >
              <span>Read full biography</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <li className="border-border bg-card flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm">
      <span className="bg-primary/10 text-primary inline-flex h-7 w-7 flex-none items-center justify-center rounded-md">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </li>
  );
}
