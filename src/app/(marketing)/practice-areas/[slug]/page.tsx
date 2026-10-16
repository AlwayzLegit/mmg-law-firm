import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { FIRM } from "@/lib/constants";
import {
  PRACTICE_AREAS,
  findPracticeArea,
  lawyerPhraseTitle,
} from "@/lib/data/practice-areas";
import { getPracticeAreaContent } from "@/lib/data/practice-area-queries";
import { getPublishedLocationPages } from "@/lib/data/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { V3_PRACTICE_PAGES } from "@/components/v3/practice-pages";
import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3CityLinks } from "@/components/v3/v3-city-links";
import { V3_BY_PATH } from "@/lib/v3/pages";

// Keep the legacy template server-rendered, but load its client controls only
// on the non-v3 branch. Do not disable SSR or defer crawlable page content.
const LegacyPracticePage = dynamic(() =>
  import("@/components/marketing/legacy-practice-page").then(
    (module) => module.LegacyPracticePage,
  ),
);

/** Practice areas rebuilt from the v3 design handoff → registry key. */
function v3KeyFor(slug: string): string | undefined {
  const key = V3_BY_PATH[`/practice-areas/${slug}`]?.key;
  return key && V3_PRACTICE_PAGES[key] ? key : undefined;
}

export const dynamicParams = false;
export const revalidate = 86400;

export async function generateStaticParams() {
  return PRACTICE_AREAS.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const v3 = v3KeyFor(slug);
  if (v3) return v3Metadata(v3);
  const area = findPracticeArea(slug);
  if (!area) {
    return buildMetadata({
      title: "Not found",
      description: "Practice area not found.",
      path: `/practice-areas/${slug}`,
      noindex: true,
    });
  }
  const resolved = await getPracticeAreaContent(slug);
  return buildMetadata({
    title: `California ${lawyerPhraseTitle(area)}`,
    description:
      resolved?.meta_description ??
      `${resolved?.intro ?? area.intro} Free consultation with ${FIRM.attorneyName}.`,
    path: `/practice-areas/${area.slug}`,
    image: null, // per-page opengraph-image.tsx
  });
}

export default async function PracticeAreaPage({ params }: Props) {
  const { slug } = await params;
  const area = findPracticeArea(slug);
  if (!area) notFound();

  const v3 = v3KeyFor(slug);
  if (v3) {
    const pages = await getPublishedLocationPages();
    const links = pages
      .filter((p) => p.practice_area_slug === slug)
      .sort((a, b) => a.city_name.localeCompare(b.city_name))
      .map((p) => ({
        href: `/locations/${p.county_slug}/${p.city_slug}/${p.practice_area_slug}`,
        label: `${p.city_name} ${area.shortName}`,
      }));
    return (
      <V3PageShell pageKey={v3} page={V3_PRACTICE_PAGES[v3]}>
        <V3CityLinks
          heading={`${area.name} representation by city`}
          intro={`${FIRM.legalName} handles ${area.nounPlural} across California. Explore the cities where we have detailed our local experience:`}
          links={links}
          deferOffscreen={["car-accidents", "truck-accidents", "motorcycle-accidents"].includes(slug)}
        />
      </V3PageShell>
    );
  }

  return <LegacyPracticePage area={area} />;
}
