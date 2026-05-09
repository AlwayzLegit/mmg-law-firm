import Link from "next/link";
import { ArrowRight, Award, GraduationCap, Languages, Scale } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

const PATH = "/attorneys/mihran-ghazaryan";

export const metadata = buildMetadata({
  title: `${FIRM.attorneyName} — California Personal-Injury Attorney`,
  description: `${FIRM.attorneyName} (CA Bar #${FIRM.barNumber}) leads ${FIRM.legalName}, a personal-injury practice based in Glendale serving California statewide. Bilingual representation in ${FIRM.languages.join(", ")}.`,
  path: PATH,
  ogType: "profile",
});

// TODO(human): replace placeholder bio sections with attorney-approved copy.
// TODO(human): drop a real headshot at /public/images/attorney/mihran.jpg
//   then uncomment the <Image> in the hero card.
// TODO(human): confirm exact bar admission date and law school for the
//   Person schema's `alumniOf` field.

export default function AttorneyBioPage() {
  // Person schema — the responsible attorney for this site, per CRPC 7.1.
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: FIRM.attorneyName,
    jobTitle: "Attorney",
    url: canonicalUrl(PATH),
    image: `${siteUrl()}/images/attorney/mihran.jpg`,
    worksFor: {
      "@type": "LegalService",
      name: FIRM.legalName,
      url: siteUrl(),
    },
    memberOf: {
      "@type": "Organization",
      name: "State Bar of California",
    },
    identifier: FIRM.barNumber,
    knowsLanguage: FIRM.languages,
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    telephone: FIRM.phone,
    sameAs: Object.values(FIRM.socials).filter(Boolean),
  };

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: FIRM.attorneyName, path: PATH },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            About
          </p>

          <div className="mt-8 grid gap-10 md:grid-cols-[320px_1fr] md:items-start">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-secondary">
              {/* TODO(human): drop /public/images/attorney/mihran.jpg
                  and uncomment.
                  <Image
                    src="/images/attorney/mihran.jpg"
                    alt={`${FIRM.attorneyName}, ${FIRM.legalName}`}
                    width={640}
                    height={800}
                    priority
                    className="h-full w-full object-cover"
                  /> */}
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Attorney photo
              </div>
            </div>

            <div>
              <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
                {FIRM.attorneyName}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                Founder & Lead Attorney, {FIRM.legalName}
              </p>

              <ul className="mt-6 grid gap-3 text-sm">
                <Stat icon={<Scale className="h-4 w-4" aria-hidden />}
                      label={`California State Bar #${FIRM.barNumber}`} />
                <Stat icon={<GraduationCap className="h-4 w-4" aria-hidden />}
                      label="Juris Doctor — TODO(human): confirm school + year" />
                <Stat icon={<Languages className="h-4 w-4" aria-hidden />}
                      label={`Counsel in ${FIRM.languages.join(", ")}`} />
                <Stat icon={<Award className="h-4 w-4" aria-hidden />}
                      label="Personal-injury practice exclusively" />
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/contact"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "gap-2 px-5 py-3 text-base h-auto",
                  )}
                >
                  <span>Free consultation</span>
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href={`tel:${FIRM.phoneTel}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "px-5 py-3 text-base h-auto",
                  )}
                >
                  Call {FIRM.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <article className="container-page py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <Section title="Why this practice">
              <p>
                {FIRM.attorneyName} founded {FIRM.legalName} to give injured
                Californians an advocate who returns calls, explains every
                option in plain language, and treats each case as if the
                outcome affected his own family — because for the client, it
                does. Solo practice is a deliberate choice: it means clients
                work with a real attorney from the first conversation through
                the final resolution, not a paralegal or a rotating cast of
                associates.
              </p>
            </Section>

            <Section title="Approach">
              <p>
                Personal-injury work rewards careful, early investigation and
                a willingness to push back firmly when an insurer is being
                unreasonable. Most matters resolve through pre-trial
                settlement — but the settlement number is set by how prepared
                the case is to go in front of a jury. We prepare every matter
                that way, regardless of how it ultimately resolves.
              </p>
              <p>
                We also believe communication is part of the job. Clients
                routinely tell us they hired a previous attorney and never
                heard from them again. We don&apos;t work that way: when you
                call, you reach the attorney handling your case.
              </p>
            </Section>

            <Section title="Languages and community">
              <p>
                The firm operates bilingually — matters can be handled in{" "}
                {FIRM.languages.join(", ")}. {FIRM.address.city} sits at the
                center of one of the country&apos;s largest Armenian-American
                communities, and the practice is intentionally rooted there
                while serving clients across the state.
              </p>
            </Section>

            <Section title="Bar admissions">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  State Bar of California (Bar No. {FIRM.barNumber}){" "}
                  {/* TODO(human): admission year */}
                </li>
                {/* TODO(human): list any federal-court admissions
                    (e.g., U.S. District Court, Central District of California).
                  */}
              </ul>
            </Section>

            <Section title="Education">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  Juris Doctor — TODO(human): law school name and year
                </li>
                <li>
                  Undergraduate — TODO(human): undergrad institution and degree
                </li>
              </ul>
            </Section>

            <Section title="Affiliations and recognition">
              <ul className="list-disc space-y-1 pl-5">
                <li>State Bar of California — Member in good standing</li>
                {/* TODO(human): consumer-attorney organizations,
                    Super Lawyers / Rising Stars selection years, Avvo rating,
                    pro bono service. Do not invent. */}
              </ul>
            </Section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              headline="Talk with Mihran directly"
              description="Free consultation. He'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      <CtaBand />
    </>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{label}</span>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-muted-foreground">{children}</div>
    </section>
  );
}
