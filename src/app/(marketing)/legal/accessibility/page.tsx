import { LegalPagePresentation } from "@/components/marketing/legal-page";
import { getLegalPage } from "@/lib/data/legal-page-queries";
import { buildMetadata } from "@/lib/seo/metadata";

const SLUG = "accessibility" as const;
const PATH = "/legal/accessibility";

export async function generateMetadata() {
  const page = await getLegalPage(SLUG);
  return buildMetadata({
    title: page.title,
    description: page.meta_description,
    path: PATH,
  });
}

export default async function AccessibilityPage() {
  const page = await getLegalPage(SLUG);
  return <LegalPagePresentation page={page} />;
}
