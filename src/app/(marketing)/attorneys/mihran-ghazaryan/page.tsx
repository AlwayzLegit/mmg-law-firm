import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Award, GraduationCap, Languages, Scale } from "lucide-react";

import { CredentialBadges } from "@/components/marketing/credential-badges";
import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { SectionEyebrow } from "@/components/marketing/section-eyebrow";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { jsonLd } from "@/lib/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import {
  attorneySameAs,
  getAttorneyProfile,
  type AttorneyProfile,
} from "@/lib/data/attorney";
import { getFirmSettings } from "@/lib/data/firm-settings";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

const PATH = "/attorneys/mihran-ghazaryan";
const SLUG = "mihran-ghazaryan";

export async function generateMetadata() {
  const profile = await getAttorneyProfile(SLUG);
  if (!profile) {
    return buildMetadata({
      title: "Attorney profile not found",
      description: "We couldn't find this attorney profile.",
      path: PATH,
      noindex: true,
    });
  }
  const langs = profile.languages.join(", ");
  return buildMetadata({
    title: `${profile.full_name} — California Personal-Injury Attorney`,
    description:
      profile.short_bio ??
      `${profile.full_name} (CA Bar #${profile.bar_number}) leads ${FIRM.legalName}, a personal-injury practice based in ${FIRM.address.city} serving California statewide.${
        langs ? ` Bilingual representation in ${langs}.` : ""
      }`,
    path: PATH,
    ogType: "profile",
  });
}

export default async function AttorneyBioPage() {
  const [profile, firm] = await Promise.all([
    getAttorneyProfile(SLUG),
    getFirmSettings(),
  ]);
  if (!profile) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    jobTitle: profile.job_title ?? "Attorney",
    url: canonicalUrl(PATH),
    image: profile.headshot_url ?? `${siteUrl()}/opengraph-image`,
    worksFor: {
      "@type": "LegalService",
      name: FIRM.legalName,
      url: siteUrl(),
      telephone: FIRM.phone,
      address: {
        "@type": "PostalAddress",
        streetAddress: FIRM.address.street,
        addressLocality: FIRM.address.city,
        addressRegion: FIRM.address.state,
        postalCode: FIRM.address.zip,
        addressCountry: FIRM.address.country,
      },
    },
    memberOf: {
      "@type": "Organization",
      name: `State Bar of ${profile.bar_state}`,
    },
    identifier: profile.bar_number,
    knowsLanguage: profile.languages,
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    telephone: FIRM.phone,
    sameAs: attorneySameAs(profile),
    ...(profile.law_school
      ? {
          alumniOf: [
            {
              "@type": "EducationalOrganization",
              name: profile.law_school,
            },
            ...(profile.undergrad_school
              ? [
                  {
                    "@type": "EducationalOrganization",
                    name: profile.undergrad_school,
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: profile.full_name, path: PATH },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(personJsonLd) }}
      />

      <Hero profile={profile} />

      <CredentialBadges profile={profile} firm={firm} />

      <article className="container-page py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div>
            <BioBody profile={profile} />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              headline={`Talk with ${profile.display_name ?? profile.full_name.split(" ")[0]} directly`}
              description="Free consultation. He'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      <CtaBand />
    </>
  );
}

function Hero({ profile }: { profile: AttorneyProfile }) {
  const initials = profile.full_name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 3);
  const lawSchoolLabel = profile.law_school
    ? profile.law_school_year
      ? `Juris Doctor — ${profile.law_school}, ${profile.law_school_year}`
      : `Juris Doctor — ${profile.law_school}`
    : null;

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 80% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(to_right,rgba(43,70,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(43,70,216,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}
      />

      <div className="container-page py-14 md:py-20">
        <SectionEyebrow>About</SectionEyebrow>

        <div className="mt-10 grid gap-10 md:grid-cols-[320px_1fr] md:items-start lg:gap-14">
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-[var(--color-gold-500)]/30"
            />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border">
              {profile.headshot_url ? (
                <Image
                  src={profile.headshot_url}
                  alt={
                    profile.headshot_alt ??
                    `${profile.full_name}, ${FIRM.legalName}`
                  }
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 320px, 100vw"
                  priority
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
                    className="absolute inset-0 flex items-center justify-center text-[8rem] font-display font-medium tracking-tighter text-primary-foreground/15"
                  >
                    {initials}
                  </div>
                </>
              )}
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3">
                <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur">
                  CA Bar #{profile.bar_number}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h1 className="font-display text-[2.4rem] font-medium leading-[1.05] tracking-tight md:text-5xl lg:text-[3.5rem]">
              {profile.full_name}
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              {profile.job_title ?? `Attorney, ${FIRM.legalName}`}
            </p>

            <ul className="mt-6 grid gap-3 text-sm">
              <Stat
                icon={<Scale className="h-4 w-4" aria-hidden />}
                label={`${profile.bar_state} State Bar #${profile.bar_number}`}
              />
              {lawSchoolLabel ? (
                <Stat
                  icon={<GraduationCap className="h-4 w-4" aria-hidden />}
                  label={lawSchoolLabel}
                />
              ) : null}
              {profile.languages.length > 0 ? (
                <Stat
                  icon={<Languages className="h-4 w-4" aria-hidden />}
                  label={`Counsel in ${profile.languages.join(", ")}`}
                />
              ) : null}
              <Stat
                icon={<Award className="h-4 w-4" aria-hidden />}
                label="Personal-injury practice exclusively"
              />
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/contact"
                className={cn(
                  buttonVariants({ size: "marketing" }),
                  "group/cta",
                )}
              >
                <span>Free consultation</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <a
                href={`tel:${FIRM.phoneTel}`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "marketing" }),
                )}
              >
                Call {FIRM.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BioBody({ profile }: { profile: AttorneyProfile }) {
  return (
    <>
      {profile.bio_md ? (
        <Section title="Biography">
          <div className="prose prose-neutral max-w-none text-muted-foreground prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {profile.bio_md}
            </ReactMarkdown>
          </div>
        </Section>
      ) : (
        <Section title="Biography">
          <p>
            {profile.full_name} founded {FIRM.legalName} to give injured
            Californians an advocate who returns calls, explains every option
            in plain language, and treats each case as if the outcome affected
            his own family — because for the client, it does.
          </p>
        </Section>
      )}

      <Section title="Bar admissions">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            State Bar of {profile.bar_state} (Bar No. {profile.bar_number})
            {profile.bar_admission_date
              ? ` — admitted ${formatDate(profile.bar_admission_date)}`
              : ""}
          </li>
          {profile.federal_court_admissions.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      {(profile.law_school || profile.undergrad_school) && (
        <Section title="Education">
          <ul className="list-disc space-y-1 pl-5">
            {profile.law_school ? (
              <li>
                Juris Doctor — {profile.law_school}
                {profile.law_school_year ? `, ${profile.law_school_year}` : ""}
              </li>
            ) : null}
            {profile.undergrad_school ? (
              <li>
                {profile.undergrad_degree ?? "Undergraduate"} —{" "}
                {profile.undergrad_school}
                {profile.undergrad_year ? `, ${profile.undergrad_year}` : ""}
              </li>
            ) : null}
          </ul>
        </Section>
      )}

      {profile.bar_associations.length > 0 ? (
        <Section title="Bar associations">
          <ul className="list-disc space-y-1 pl-5">
            {profile.bar_associations.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {profile.honors_md ? (
        <Section title="Recognition">
          <div className="prose prose-neutral max-w-none text-muted-foreground prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {profile.honors_md}
            </ReactMarkdown>
          </div>
        </Section>
      ) : null}

      {profile.languages.length > 0 ? (
        <Section title="Languages and community">
          <p>
            The firm operates in {profile.languages.join(", ")}.{" "}
            {FIRM.address.city}{" "}
            sits at the center of one of the country&apos;s largest
            Armenian-American communities, and the practice is intentionally
            rooted there while serving clients across the state.
          </p>
        </Section>
      ) : null}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
