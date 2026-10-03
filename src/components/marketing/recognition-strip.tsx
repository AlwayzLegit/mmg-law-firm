import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { CountUp } from "./primitives/count-up";
import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";
import { Seal } from "./primitives/seal";

type Props = {
  className?: string;
};

const YEARS = [2023, 2024, 2025, 2026];

/**
 * Recognition — the attorney's Super Lawyers Rising Stars years (2023–2026),
 * bar number, practice focus and languages.
 *
 * Sources: Super Lawyers profile at
 * profiles.superlawyers.com/california/glendale/lawyer/mihran-ghazaryan
 * (Rising Stars 2023–2026) and FIRM constants. Copy is verbatim from v1.
 */
export function RecognitionStrip({ className }: Props) {
  const bar = Number(FIRM.barNumber);
  return (
    <section className={cn("bg-background text-foreground", className)}>
      <div className="container-page section-pad-sm grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-center gap-12">
        <Reveal className="flex flex-col items-center gap-6">
          <Seal variant="medallion" years={YEARS.join(" · ")} />
          <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
            {YEARS.map((y) => (
              <li
                key={y}
                className="border-ink/18 bg-card rounded-full border px-3 py-1.5 text-[13px] font-semibold tracking-[0.04em]"
              >
                {y}
              </li>
            ))}
          </ul>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Recognition</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-display mt-4 max-w-[22ch] font-semibold">
              Selected to <em className="em-gold">Super Lawyers Rising Stars</em> four years running.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="text-stone mt-4 max-w-[60ch] text-base">
              Fewer than 2.5% of attorneys under 40 in California earn the
              Rising Stars designation each year. {FIRM.attorneyName} has been
              selected by Super Lawyers in 2023, 2024, 2025, and 2026.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <dl className="border-ink/14 mt-8 grid grid-cols-3 border-t max-sm:grid-cols-1">
              <Stat
                className="border-ink/14 pr-4 sm:border-r"
                value={
                  <>
                    CA Bar{" "}
                    {Number.isFinite(bar) ? (
                      <CountUp to={bar} from={Math.max(0, bar - 455)} />
                    ) : (
                      FIRM.barNumber
                    )}
                  </>
                }
                label="Licensed since 2016"
              />
              <Stat
                className="border-ink/14 sm:border-r sm:px-4"
                value="Personal injury"
                label="Plaintiff-side · Statewide CA"
              />
              <Stat
                className="sm:pl-4"
                value={
                  <>
                    <CountUp to={FIRM.languages.length} />-language
                  </>
                }
                label={FIRM.languages.join(" · ")}
              />
            </dl>
          </Reveal>
          <p className="text-stone mt-5 max-w-[70ch] text-xs">
            Super Lawyers Rising Stars is a peer-nominated, research-driven
            selection limited to no more than 2.5% of California attorneys under
            40 each year. Recognition is not a guarantee of any future result.
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  className,
}: {
  value: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 pt-5 max-sm:border-ink/14 max-sm:border-b max-sm:pb-5", className)}>
      <dd className="font-display m-0 text-[clamp(24px,3vw,40px)] leading-none font-semibold tracking-[-0.03em] [overflow-wrap:anywhere]">
        {value}
      </dd>
      <dt className="text-stone mt-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">{label}</dt>
    </div>
  );
}
