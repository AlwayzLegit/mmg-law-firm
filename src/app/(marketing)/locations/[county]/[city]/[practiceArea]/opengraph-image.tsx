import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
  titleCaseSlug,
} from "@/lib/seo/og-image";

export const runtime = "nodejs";
export const contentType = OG_CONTENT_TYPE;
export const size = OG_SIZE;
export const alt = "MMG Law Firm — local personal-injury counsel";

export default async function Image({
  params,
}: {
  params: Promise<{ city: string; practiceArea: string }>;
}) {
  const { city, practiceArea } = await params;
  return renderOgImage({
    title: `${titleCaseSlug(city)} ${titleCaseSlug(practiceArea)} lawyer.`,
    subtitle: "Local representation, statewide reach. No fee unless we win.",
  });
}
