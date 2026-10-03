import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Award, Phone } from "lucide-react";

import { CredentialBadges } from "@/components/marketing/credential-badges";
import { CtaBand } from "@/components/marketing/cta-band";
import { LeadForm } from "@/components/marketing/lead-form";
import { Eyebrow } from "@/components/marketing/primitives/eyebrow";
import { Seal } from "@/components/marketing/primitives/seal";
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
import { ATTORNEY_IMAGES, mediaUrl } from "@/lib/media";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

const PATH = "/attorneys/mihran-ghazaryan";
const SLUG = "mihran-ghazaryan";

/** Super Lawyers Rising Stars selection years (profile verified; see
 *  RecognitionStrip for the source). */
const RISING_YEARS = [2023, 2024, 2025, 2026];

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
            { "@type": "EducationalOrganization", name: profile.law_school },
            ...(profile.undergrad_school
              ? [{ "@type": "EducationalOrganization", name: profile.undergrad_school }]
              : []),
          ],
        }
      : {}),
  };

  const firstName = profile.display_name ?? profile.full_name.split(" ")[0];

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: profile.full_name, path: PATH },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(personJsonLd) }} />

      <Hero profile={profile} />

      <article className="container-page grid items-start gap-12 pt-[clamp(48px,7vw,72px)] pb-24 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="min-w-0">
          <BioBody profile={profile} />

          <CredentialBadges profile={profile} firm={firm} className="mt-10" />

          <Recognition honorsMd={profile.honors_md} />

          {profile.languages.length > 0 ? (
            <section className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] items-center gap-7">
              <div>
                <Eyebrow>Rooted in {FIRM.address.city}</Eyebrow>
                <h2 className="text-display-xs mt-3 font-semibold">Languages and community</h2>
                <p className="text-stone mt-3.5 text-[15.5px]">
                  The firm operates in {profile.languages.join(", ")}. {FIRM.address.city}{" "}
                  sits at the center of one of the country&apos;s largest Armenian-American communities, and the practice is intentionally rooted
                  there while serving clients across the state.
                </p>
                <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
                  {profile.languages.map((l) => (
                    <li
                      key={l}
                      className="bg-card border-line-strong rounded-full border px-3.5 py-2 text-[13px] font-semibold"
                    >
                      {nativeLanguageLabel(l)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-[#dfe6f5]">
                  <Image
                    src={profile.headshot_url ?? mediaUrl(ATTORNEY_IMAGES.homepageHero)}
                    alt={profile.headshot_alt ?? profile.full_name}
                    fill
                    sizes="(min-width: 1024px) 220px, 45vw"
                    className="object-cover object-top"
                  />
                </div>
                <div className="bg-ink-soft relative mt-7 aspect-[4/5] overflow-hidden rounded-[14px]">
                  <Image
                    src="/brand/consultation.webp"
                    alt="Client consultation"
                    fill
                    sizes="(min-width: 1024px) 220px, 45vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside id="intake" className="scroll-mt-[124px] lg:sticky lg:top-[124px]">
          <LeadForm
            variant="compact"
            headline={`Talk with ${firstName} directly`}
            description="Free consultation. He'll call you back within one business hour during office hours."
          />
        </aside>
      </article>

      <CtaBand />
    </>
  );
}

function nativeLanguageLabel(l: string): string {
  if (l === "Armenian") return "Հայերեն · Armenian";
  if (l === "Russian") return "Русский · Russian";
  return l;
}

function Hero({ profile }: { profile: AttorneyProfile }) {
  const parts = profile.full_name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : null;
  const first = last ? parts.slice(0, -1).join(" ") : profile.full_name;
  const lawSchoolLabel = profile.law_school
    ? profile.law_school_year
      ? `${profile.law_school}, ${profile.law_school_year}`
      : profile.law_school
    : null;
  const portrait = profile.headshot_url ?? "/brand/attorney-portrait.webp";

  return (
    <section className="surface-ink bg-background text-foreground under-header relative isolate overflow-hidden">
      <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[60%] max-lg:w-full">
        <Image
          src={portrait}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
          style={{ objectPosition: "50% 22%" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f1115_0%,rgba(15,17,21,.8)_26%,rgba(15,17,21,.06)_64%,rgba(15,17,21,.35)_100%)] max-lg:bg-[linear-gradient(to_bottom,rgba(15,17,21,.92),rgba(15,17,21,.75))]" />
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink to-transparent" />
      </div>
      <div className="container-page relative">
        <Seal years="2023 – 2026" className="absolute top-[clamp(12px,2vw,24px)] right-[clamp(16px,3vw,40px)] max-md:hidden" />
        <nav aria-label="Breadcrumb">
          <ol className="text-cream/55 m-0 flex list-none flex-wrap gap-2 p-0 text-xs tracking-[0.1em] uppercase">
            <li>
              <Link href="/" className="hover:text-cream no-underline transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-gold" aria-current="page">
              About
            </li>
          </ol>
        </nav>
        <div className="mt-7 max-w-[640px]">
          <Eyebrow>{profile.job_title ?? "Founder & Lead Attorney"}</Eyebrow>
          <h1 className="text-cream mt-4 text-[clamp(46px,6.4vw,84px)] leading-[0.98] font-semibold tracking-[-0.03em]">
            {first}
            {last ? (
              <>
                {" "}
                <em className="em-gold">{last}</em>
              </>
            ) : null}
          </h1>
          <p className="text-cream/74 mt-5 max-w-[54ch] text-[16.5px] leading-[1.6]">
            {profile.short_bio ??
              `${profile.full_name} leads ${FIRM.legalName}, a ${FIRM.address.city}-based personal-injury practice serving injured clients across California.`}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#intake" className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}>
              <span>Free consultation</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
            </Link>
            <a href={`tel:${FIRM.phoneTel}`} className={buttonVariants({ variant: "outline-cream", size: "pill" })}>
              <Phone className="h-[15px] w-[15px]" aria-hidden />
              Call {FIRM.phone}
            </a>
          </div>
        </div>
        <dl className="border-cream/12 m-0 mt-14 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] border-t">
          <Credential label={`${profile.bar_state} State Bar`} value={`#${profile.bar_number}`} first />
          {lawSchoolLabel ? <Credential label="Juris Doctor" value={lawSchoolLabel} /> : null}
          {profile.languages.length > 0 ? (
            <Credential label="Languages" value={`Counsel in ${profile.languages.join(" · ")}`} />
          ) : null}
          <Credential label="Recognition" value={`Super Lawyers Rising Stars ${RISING_YEARS[0]}–${RISING_YEARS[RISING_YEARS.length - 1]}`} last />
        </dl>
      </div>
    </section>
  );
}

function Credential({ label, value, first, last }: { label: string; value: string; first?: boolean; last?: boolean }) {
  return (
    <div className={cn("pt-5 pb-6", first ? "pr-5" : last ? "pl-5" : "px-5", "max-sm:px-0")}>
      <dt className="text-cream/50 text-[11px] tracking-[0.16em] uppercase">{label}</dt>
      <dd className="font-display text-cream m-0 mt-1.5 text-[22px] leading-[1.15] font-semibold">{value}</dd>
    </div>
  );
}

function Recognition({ honorsMd }: { honorsMd: string | null }) {
  return (
    <section className="surface-ink bg-background text-foreground mt-12 rounded-[18px] p-8 max-sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-gold m-0 text-[11px] font-semibold tracking-[0.16em] uppercase">Recognition</p>
          <h2 className="text-cream mt-2.5 text-display-xs leading-[1.1] font-semibold tracking-[-0.02em]">
            Super Lawyers Rising Stars, four years running.
          </h2>
        </div>
        <p className="text-cream/70 max-w-[44ch] text-sm">
          Fewer than 2.5% of attorneys under 40 in California earn the Rising Stars designation each year.
        </p>
      </div>
      <ol className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 p-0">
        {RISING_YEARS.map((y) => (
          <li key={y} className="bg-cream/5 border-cream/10 rounded-[14px] border px-4 py-[18px] text-center">
            <span className="bg-seal text-ink inline-flex h-[46px] w-[46px] items-center justify-center rounded-full">
              <Award className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display text-cream m-0 mt-3 text-3xl leading-none font-semibold tracking-[-0.02em]">{y}</p>
            <p className="text-gold m-0 mt-1 text-[10px] font-semibold tracking-[0.14em] uppercase">Rising Star</p>
          </li>
        ))}
      </ol>
      {honorsMd ? (
        <div className="prose-v2 prose-invert text-cream/74 mt-6 text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{honorsMd}</ReactMarkdown>
        </div>
      ) : null}
      <p className="text-cream/45 mt-4 text-xs">
        Super Lawyers Rising Stars is a peer-nominated, research-driven selection limited to no more than 2.5% of
        California attorneys under 40 each year. Recognition is not a guarantee of any future result.
      </p>
    </section>
  );
}

function BioBody({ profile }: { profile: AttorneyProfile }) {
  return (
    <>
      <section>
        <Eyebrow as="span">Biography</Eyebrow>
        <h2 className="sr-only">Biography</h2>
        {profile.bio_md ? (
          <div className="prose-v2 mt-4 text-[17px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{profile.bio_md}</ReactMarkdown>
          </div>
        ) : (
          <>
            <p className="font-display mt-4 text-[clamp(20px,2vw,24px)] leading-[1.5] font-medium tracking-[-0.01em]">
              {profile.full_name} founded {FIRM.legalName} to give injured Californians an advocate who returns
              calls, explains every option in plain language, and treats each case as if the outcome affected his
              own family — because for the client, it does.
            </p>
            <p className="text-stone mt-3.5 text-[15.5px]">
              {profile.display_name ?? profile.full_name.split(" ")[0]} is admitted in {profile.bar_state} (Bar No.{" "}
              {profile.bar_number}) and represents clients across the state from the firm&apos;s office in{" "}
              {FIRM.address.city}.
              {profile.languages.length > 1
                ? ` The practice is bilingual: matters can be handled in ${profile.languages.join(", ")}.`
                : ""}
            </p>
          </>
        )}
      </section>

      <Section title="Bar admissions">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            State Bar of {profile.bar_state} (Bar No. {profile.bar_number})
            {profile.bar_admission_date ? ` — admitted ${formatDate(profile.bar_admission_date)}` : ""}
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
                {profile.undergrad_degree ?? "Undergraduate"} — {profile.undergrad_school}
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
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-display-xs font-semibold">{title}</h2>
      <div className="text-stone mt-4 space-y-4 text-[15.5px]">{children}</div>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
