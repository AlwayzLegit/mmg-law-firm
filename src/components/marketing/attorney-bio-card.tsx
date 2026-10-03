import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Award, GraduationCap, Languages, Scale } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getAttorneyProfile } from "@/lib/data/attorney";
import { FIRM } from "@/lib/constants";
import { ATTORNEY_IMAGES, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";

type Props = {
  className?: string;
  /** Attorney slug to feature. Defaults to the firm's lead attorney. */
  slug?: string;
};

const DEFAULT_SLUG = "mihran-ghazaryan";

/** Used when an attorney profile has no headshot_url set in the DB. Points at
 *  the firm's real owner-provided photo in the media bucket (optimized by
 *  Vercel), so the homepage "Meet" section never falls back to the gradient
 *  initials. */
const DEFAULT_HEADSHOT_URL = mediaUrl(ATTORNEY_IMAGES.homepageHero);

/**
 * "Meet Mihran" (redesign v2): paper-2 section, 4:5 headshot with an ink
 * caption card, bio copy, credential chips and an ink pill to the full bio.
 */
export async function AttorneyBioCard({ className, slug = DEFAULT_SLUG }: Props) {
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
    <section id="about" className={cn("surface-paper-2 bg-background text-foreground border-line border-t", className)}>
      <div className="container-page section-pad grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-center gap-12">
        <Reveal className="relative">
          <div className="border-line relative aspect-[4/5] overflow-hidden rounded-2xl border bg-[#dfe6f5]">
            {headshotUrl ? (
              <Image
                src={headshotUrl}
                alt={profile.headshot_alt ?? `${profile.full_name}, ${FIRM.legalName}`}
                fill
                className="object-cover object-top"
                sizes="(min-width: 1024px) 560px, 100vw"
              />
            ) : (
              <div
                aria-hidden
                className="bg-ink-panel font-display text-cream/15 absolute inset-0 flex items-center justify-center text-[10rem] font-semibold tracking-tighter"
              >
                {initials}
              </div>
            )}
          </div>
          <div className="bg-ink text-cream absolute right-3 bottom-7 rounded-xl px-[18px] py-4 shadow-[0_20px_40px_-20px_rgba(15,17,21,.6)]">
            <p className="text-gold m-0 text-[10px] tracking-[0.16em] uppercase">
              {profile.job_title?.split("&")[0]?.trim() || "Founder"}
            </p>
            <p className="font-display m-0 mt-1 text-lg leading-[1.1] font-semibold">{profile.full_name}</p>
            <p className="text-cream/60 m-0 mt-1 text-[11px]">CA #{profile.bar_number}</p>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>About</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-display-lg mt-3.5 font-semibold">Meet {firstName}.</h2>
          </Reveal>
          <Reveal delay={120}>
            {profile.short_bio ? (
              <p className="mt-[18px] text-lg leading-[1.6]">{profile.short_bio}</p>
            ) : (
              <p className="mt-[18px] text-lg leading-[1.6]">
                {profile.full_name} founded {FIRM.legalName} to give injured Californians an advocate who returns
                calls, explains every option in plain language, and treats each case as if the outcome affected his
                own family — because for the client, it does.
              </p>
            )}
          </Reveal>
          <Reveal delay={160}>
            <p className="text-stone mt-3 text-[15.5px]">
              {firstName} is admitted in {profile.bar_state} (Bar No. {profile.bar_number}) and represents clients
              across the state from the firm&apos;s office in {FIRM.address.city}.
              {profile.languages.length > 1 ? (
                <>
                  {" "}
                  The practice is bilingual: matters can be handled in {profile.languages.join(", ")}.
                </>
              ) : null}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5 p-0">
              <Chip icon={Scale} label={`${profile.bar_state} Bar #${profile.bar_number}`} />
              {profile.languages.length > 0 ? (
                <Chip icon={Languages} label={`Counsel in ${profile.languages.join(", ")}`} />
              ) : null}
              <Chip icon={Award} label="Personal injury & employment law" />
              {lawSchoolLine ? <Chip icon={GraduationCap} label={lawSchoolLine} /> : null}
            </ul>
          </Reveal>
          <Reveal delay={240}>
            <Link
              href={`/attorneys/${profile.slug}`}
              className={cn(buttonVariants({ variant: "ink", size: "pill-sm" }), "mt-7 h-12 px-[22px] text-sm")}
            >
              <span>Read full biography</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Chip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <li className="bg-card border-line flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm font-medium">
      <Icon className="text-gold-deep h-[18px] w-[18px] flex-none" aria-hidden />
      <span className="truncate">{label}</span>
    </li>
  );
}
