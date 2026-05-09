import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { buttonVariants } from "@/components/ui/button";
import { FIRM, DISCLAIMERS } from "@/lib/constants";
import { PRACTICE_AREAS, findPracticeArea } from "@/lib/data/practice-areas";
import { PRACTICE_AREA_CONTENT } from "@/lib/data/practice-area-content";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildFaqPage } from "@/lib/seo/schema";
import { cn } from "@/lib/utils";

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  // Group D will swap to Supabase: only return practice_areas.is_published.
  // Static seed treats every entry as available.
  return PRACTICE_AREAS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const area = findPracticeArea(slug);
  if (!area) {
    return buildMetadata({
      title: "Not found",
      description: "Practice area not found.",
      path: `/practice-areas/${slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: `California ${area.name} Lawyer`,
    description: `${area.intro} Free consultation with ${FIRM.attorneyName}.`,
    path: `/practice-areas/${area.slug}`,
  });
}

export default async function PracticeAreaPage({ params }: Props) {
  const { slug } = await params;
  const area = findPracticeArea(slug);
  if (!area) notFound();

  const content = PRACTICE_AREA_CONTENT[area.slug];
  const path = `/practice-areas/${area.slug}`;

  // Per-page LegalService JSON-LD scoped to this practice area + FAQ schema.
  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: `${FIRM.legalName} — ${area.name}`,
    url: canonicalUrl(path),
    image: defaultOgImageUrl(),
    description: area.intro,
    telephone: FIRM.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: FIRM.address.street,
      addressLocality: FIRM.address.city,
      addressRegion: FIRM.address.state,
      postalCode: FIRM.address.zip,
      addressCountry: FIRM.address.country,
    },
    areaServed: { "@type": "State", name: "California" },
    serviceType: area.lawyerPhrase,
  };

  const faqGraph = content?.faqs?.length
    ? buildFaqPage(content.faqs)
    : null;

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Practice Areas", path: "/practice-areas" },
          { name: area.name, path },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(legalService).replace(/</g, "\\u003c"),
        }}
      />
      {faqGraph ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqGraph).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Attorney Advertising
          </p>
          <nav
            aria-label="Breadcrumb"
            className="mt-3 text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary">
              Home
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <Link href="/practice-areas" className="hover:text-primary">
              Practice Areas
            </Link>
            <span className="mx-1.5 text-muted-foreground/50">/</span>
            <span className="text-foreground">{area.name}</span>
          </nav>

          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            California {area.name} Attorney
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            {area.intro}
          </p>

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
      </section>

      <article className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr] lg:gap-16">
          <div className="prose-area">
            <p className="text-lg leading-relaxed text-muted-foreground">
              {content?.body ?? area.intro}
            </p>

            {content?.subtopics?.length ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  What we handle
                </h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {content.subtopics.map((s) => (
                    <div
                      key={s.title}
                      className="rounded-xl border border-border bg-card p-6"
                    >
                      <h3 className="font-display text-base font-medium">
                        {s.title}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {content?.process?.length ? (
              <section className="mt-12">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  How we work
                </h2>
                <ol className="mt-6 space-y-5">
                  {content.process.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-display text-base font-medium">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {content?.whatToDo?.length ? (
              <section className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8">
                <h2 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
                  What to do right away
                </h2>
                <ul className="mt-6 space-y-3">
                  {content.whatToDo.map((line) => (
                    <li key={line} className="flex items-start gap-3 text-sm">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 flex-none text-primary"
                        aria-hidden
                      />
                      <span className="text-foreground">{line}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-muted-foreground">
                  {DISCLAIMERS.general}
                </p>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <LeadForm
              variant="compact"
              defaultPracticeArea={area.slug}
              headline={`Tell us about your ${area.nounSingular}`}
              description="Free consultation. We'll call you back within one business hour during office hours."
            />
          </aside>
        </div>
      </article>

      {content?.faqs?.length ? (
        <Faq items={content.faqs} heading={`${area.shortName} FAQ`} />
      ) : null}

      <CtaBand
        heading={`Injured in a ${area.nounSingular}?`}
        body="Free consultation. Bilingual counsel. No fee unless we win your case."
      />
    </>
  );
}
