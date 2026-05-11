import { LegalPagePresentation } from "@/components/marketing/legal-page";
import { getLegalPage } from "@/lib/data/legal-page-queries";
import { buildMetadata } from "@/lib/seo/metadata";

const SLUG = "disclaimer" as const;
const PATH = "/legal/disclaimer";

export async function generateMetadata() {
  const page = await getLegalPage(SLUG);
  return buildMetadata({
    title: page.title,
    description: page.meta_description,
    path: PATH,
  });
}

export default async function DisclaimerPage() {
  const page = await getLegalPage(SLUG);
  return <LegalPagePresentation page={page} />;
}
