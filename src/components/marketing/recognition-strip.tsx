import { Award, Star } from "lucide-react";

import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Recognition strip — three trust-signal cards showing the attorney's
 * Super Lawyers Rising Stars years (2023 / 2024 / 2025), the firm's
 * contingency-fee approach, and the bilingual representation.
 *
 * Sources: Super Lawyers profile at
 * profiles.superlawyers.com/california/glendale/lawyer/mihran-ghazaryan
 * (Rising Stars 2023, 2024, 2025) and FIRM constants.
 */
export function RecognitionStrip({ className }: Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-y border-border bg-gradient-to-b from-secondary/30 via-background to-secondary/30",
        className,
      )}
    >
      {/* ambient gold orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse, color-mix(in oklab, var(--color-gold-500) 14%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="container-page py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <SectionEyebrow className="justify-center">Recognition</SectionEyebrow>
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight md:text-3xl">
            Selected to{" "}
            <span className="bg-gradient-to-r from-[var(--color-gold-700,#a98442)] via-[var(--color-gold-500)] to-[var(--color-gold-700,#a98442)] bg-clip-text text-transparent">
              Super Lawyers Rising Stars
            </span>{" "}
            three years running.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground md:text-base">
            Fewer than 2.5% of attorneys under 40 in California earn the
            Rising Stars designation each year. {FIRM.attorneyName} has been
            selected by Super Lawyers in 2023, 2024, and 2025.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-5xl gap-5 sm:grid-cols-3">
          {[2023, 2024, 2025].map((year, idx) => (
            <li key={year}>
              <article
                className={cn(
                  "group relative flex h-full flex-col items-center overflow-hidden rounded-3xl border border-border bg-card p-8 text-center ring-1 ring-border/30 transition-transform duration-300 hover:-translate-y-1",
                  // The middle (most recent) card pops slightly
                  idx === 2 && "md:scale-[1.04]",
                )}
              >
                {/* ribbon corner */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-gold-500)]/70 via-[var(--color-gold-300,#e3c489)] to-[var(--color-gold-500)]/70"
                />

                {/* Award medallion */}
                <span className="relative inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-gold-300,#e3c489)] to-[var(--color-gold-600,#a98442)] text-white shadow-[0_18px_40px_-18px_rgba(169,132,66,0.7)] ring-4 ring-[var(--color-gold-500)]/15">
                  <Award className="h-9 w-9" aria-hidden />
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/30"
                  />
                </span>

                {/* stars row */}
                <div className="mt-5 flex items-center gap-0.5 text-[var(--color-gold-500)]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" aria-hidden />
                  ))}
                </div>

                <p className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
                  {year}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Rising Star
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Super Lawyers — California
                </p>
              </article>
            </li>
          ))}
        </ul>

        {/* secondary trust band — bar, federal courts, languages */}
        <div className="mt-12 grid gap-4 rounded-2xl border border-border bg-card/60 p-6 backdrop-blur sm:grid-cols-3 md:p-7">
          <div className="text-center sm:border-r sm:border-border">
            <p className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              CA Bar #{FIRM.barNumber}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Licensed since 2016
            </p>
          </div>
          <div className="text-center sm:border-r sm:border-border">
            <p className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              State + Federal
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              CA Courts + C.D. Cal.
            </p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-medium tracking-tight md:text-3xl">
              {FIRM.languages.length}-language
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {FIRM.languages.join(" · ")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
