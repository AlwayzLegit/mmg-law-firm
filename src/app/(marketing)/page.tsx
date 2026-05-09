import Link from "next/link";
import { Phone, ShieldCheck, Globe2, Award } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal-Injury Attorney",
  description:
    "Mihran M. Ghazaryan, Esq. — California personal-injury counsel based in Glendale. Free consultation. No fee unless we win.",
  path: "/",
});

// TODO(human): Group B replaces this placeholder with the full hero,
// practice-area grid, trust signals, case-results carousel, testimonials,
// locations, lead form, and FAQ.

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-16 md:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Attorney Advertising
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight text-foreground md:text-5xl lg:text-6xl">
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
              className={buttonVariants({ size: "lg" })}
            >
              Request Free Consultation
            </Link>
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <Phone className="h-4 w-4" aria-hidden />
              Call {FIRM.phone}
            </a>
          </div>

          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            <TrustItem
              icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
              title="No fee unless we win"
              body="Contingency representation across all personal-injury matters."
            />
            <TrustItem
              icon={<Globe2 className="h-5 w-5" aria-hidden />}
              title="Bilingual representation"
              body={`Counsel available in ${FIRM.languages.join(", ")}.`}
            />
            <TrustItem
              icon={<Award className="h-5 w-5" aria-hidden />}
              title="A real attorney handles your case"
              body={`${FIRM.attorneyName} personally manages every matter.`}
            />
          </ul>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12">
          <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
            Site under active build
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The full site (practice-area pages, statewide locations, attorney
            biography, blog, and online intake) is being assembled. In the
            meantime,{" "}
            <a
              href={`tel:${FIRM.phoneTel}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              call {FIRM.phone}
            </a>{" "}
            for a free consultation, or visit our{" "}
            <Link
              href="/contact"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              contact page
            </Link>
            .
          </p>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {DISCLAIMERS.general}
          </p>
        </div>
      </section>
    </>
  );
}

function TrustItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}
