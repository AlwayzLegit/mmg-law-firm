import { LegalPagePresentation } from "@/components/marketing/legal-page";
import { getLegalPage } from "@/lib/data/legal-page-queries";
import { buildMetadata } from "@/lib/seo/metadata";

const SLUG = "privacy" as const;
const PATH = "/legal/privacy";

export async function generateMetadata() {
  const page = await getLegalPage(SLUG);
  return buildMetadata({
    title: page.title,
    description: page.meta_description,
    path: PATH,
  });
}

export default async function PrivacyPage() {
  const page = await getLegalPage(SLUG);
  return <LegalPagePresentation page={page} />;
}
