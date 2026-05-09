import Link from "next/link";
import { ArrowRight, Award, GraduationCap, Languages, Scale } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

type Props = { className?: string };

// TODO(human): replace the bio paragraphs with attorney-approved copy.
// TODO(human): drop a real headshot at /public/images/attorney/mihran.jpg.

export function AttorneyBioCard({ className }: Props) {
  // Initials for the photo placeholder watermark.
  const initials = FIRM.attorneyName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3);

  return (
    <section className={cn("container-page py-20 md:py-28", className)}>
      <div className="grid gap-10 md:grid-cols-[300px_1fr] md:items-start lg:grid-cols-[360px_1fr] lg:gap-16">
        {/* Photo placeholder — designed to look intentional rather than missing. */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/30"
          />
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border">
            {/* TODO(human): drop /public/images/attorney/mihran.jpg
                  and replace this gradient block with:
                  <Image
                    src="/images/attorney/mihran.jpg"
                    alt={`${FIRM.attorneyName}, ${FIRM.legalName}`}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 360px, (min-width: 768px) 300px, 100vw"
                    priority={false}
                  /> */}
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
              className="absolute inset-0 flex items-center justify-center text-[10rem] font-display font-medium tracking-tighter text-primary-foreground/15"
            >
              {initials}
            </div>
            <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/80">
                  Founding attorney
                </p>
                <p className="mt-1 font-display text-base font-medium text-primary-foreground">
                  {FIRM.attorneyName}
                </p>
              </div>
              <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur">
                CA #{FIRM.barNumber}
              </span>
            </div>
          </div>
        </div>

        <div>
          <SectionEyebrow>About</SectionEyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Meet {FIRM.attorneyName.split(" ")[0]}.
          </h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p className="text-lg leading-relaxed">
              {FIRM.attorneyName} founded {FIRM.legalName} to give injured
              Californians an advocate who returns calls, explains every
              option in plain language, and treats each case as if the
              outcome affected his own family — because for the client, it
              does.
            </p>
            <p>
              Mihran is admitted in California (Bar No. {FIRM.barNumber}) and
              represents clients across the state from the firm&apos;s office
              in Glendale. The practice is bilingual: matters can be handled
              in {FIRM.languages.join(", ")}.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            <Stat icon={Scale} label={`California Bar #${FIRM.barNumber}`} />
            <Stat icon={Languages} label={`Counsel in ${FIRM.languages.join(", ")}`} />
            <Stat icon={Award} label="Personal-injury practice exclusively" />
            <Stat icon={GraduationCap} label="JD — TODO(human): law school" />
          </ul>

          <div className="mt-10">
            <Link
              href="/attorneys/mihran-ghazaryan"
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
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm">
      <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className="truncate">{label}</span>
    </li>
  );
}
