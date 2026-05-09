import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = { className?: string };

// TODO(human): replace the bio paragraphs below with attorney-approved copy.
// TODO(human): drop a real headshot at /public/images/attorney/mihran.jpg and
// uncomment the <Image> block.

export function AttorneyBioCard({ className }: Props) {
  return (
    <section className={cn("container-page py-16 md:py-24", className)}>
      <div className="grid gap-10 md:grid-cols-[280px_1fr] md:items-start">
        <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-secondary">
          {/* <Image
                src="/images/attorney/mihran.jpg"
                alt={`${FIRM.attorneyName}, ${FIRM.legalName}`}
                width={560}
                height={700}
                priority={false}
                className="h-full w-full object-cover"
              /> */}
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            Attorney photo
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            About
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Meet {FIRM.attorneyName.split(" ")[0]}.
          </h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              {FIRM.attorneyName} founded {FIRM.legalName} to give injured
              Californians an advocate who returns calls, explains every option
              in plain language, and treats each case as if the outcome
              affected his own family — because for the client, it does.
            </p>
            <p>
              Mihran is admitted in California (Bar No. {FIRM.barNumber}) and
              represents clients across the state from the firm&apos;s office
              in Glendale. The practice is bilingual: matters can be handled in{" "}
              {FIRM.languages.join(", ")}.
            </p>
          </div>

          <div className="mt-8">
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
