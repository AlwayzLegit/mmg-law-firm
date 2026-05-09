import Link from "next/link";
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  Globe2,
  Award,
  type LucideIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type HeroProps = {
  className?: string;
};

export function Hero({ className }: HeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background",
        className,
      )}
    >
      <div className="container-page py-16 md:py-24 lg:py-28">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
          Attorney Advertising
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl lg:text-[3.75rem] lg:leading-[1.05]">
          When the unexpected happens, the call you make next matters.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          {FIRM.legalName} represents Californians injured in car, truck,
          motorcycle, pedestrian, bicycle, rideshare, and slip-and-fall
          accidents. Free consultation. No fee unless we win your case.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 px-5 py-3 text-base h-auto",
            )}
          >
            <span>Request Free Consultation</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "gap-2 px-5 py-3 text-base h-auto",
            )}
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>Call {FIRM.phone}</span>
          </a>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-3">
          <TrustItem
            icon={ShieldCheck}
            title="No fee unless we win"
            body="Contingency representation across all personal-injury matters."
          />
          <TrustItem
            icon={Globe2}
            title="Bilingual representation"
            body={`Counsel available in ${FIRM.languages.join(", ")}.`}
          />
          <TrustItem
            icon={Award}
            title="Direct attorney attention"
            body={`${FIRM.attorneyName} personally manages every matter.`}
          />
        </ul>
      </div>
    </section>
  );
}

function TrustItem({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
