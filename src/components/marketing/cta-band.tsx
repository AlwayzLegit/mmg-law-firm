import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  heading?: string;
  body?: string;
  className?: string;
};

export function CtaBand({
  heading = "Ready to talk?",
  body = "Free consultation. Bilingual counsel. No fee unless we win your case.",
  className,
}: Props) {
  return (
    <section className={cn("border-y border-border bg-primary text-primary-foreground", className)}>
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center md:py-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
            {heading}
          </h2>
          <p className="mt-2 text-primary-foreground/80">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "gap-2 px-5 py-3 text-base h-auto",
            )}
          >
            <span>Request consultation</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-primary-foreground/30 bg-transparent text-primary-foreground gap-2 px-5 py-3 text-base h-auto hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            <Phone className="h-4 w-4" aria-hidden />
            <span>{FIRM.phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
