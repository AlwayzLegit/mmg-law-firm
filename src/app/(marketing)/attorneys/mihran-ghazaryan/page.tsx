import { notFound } from "next/navigation";

import { V3PageShell } from "@/components/v3/v3-page-shell";
import { V3AttorneyPage } from "@/components/v3/pages/attorney";
import { jsonLd } from "@/lib/seo/json-ld";
import { FIRM } from "@/lib/constants";
import { attorneySameAs, getAttorneyProfile } from "@/lib/data/attorney";
import { canonicalUrl, siteUrl } from "@/lib/seo/canonical";
import { buildMetadata } from "@/lib/seo/metadata";
import { FIRM_LEGAL_SERVICE_ID } from "@/lib/seo/schema";

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
      // Kept under ~160 characters so search results don't truncate it.
      `${profile.full_name} (CA Bar #${profile.bar_number}) leads ${FIRM.legalName}, a ${FIRM.address.city} personal-injury practice serving California.${
        langs ? ` Counsel in ${langs}.` : ""
      }`,
    path: PATH,
    ogType: "profile",
  });
}

export default async function AttorneyBioPage() {
  const profile = await getAttorneyProfile(SLUG);
  if (!profile) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.full_name,
    jobTitle: profile.job_title ?? "Attorney",
    url: canonicalUrl(PATH),
    image: profile.headshot_url ?? `${siteUrl()}/opengraph-image`,
    worksFor: {
      "@id": FIRM_LEGAL_SERVICE_ID,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(personJsonLd) }}
      />
      <V3PageShell pageKey="attorney" page={V3AttorneyPage} />
    </>
  );
}
