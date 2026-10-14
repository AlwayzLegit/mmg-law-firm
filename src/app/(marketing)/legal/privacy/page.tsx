import { LegalPagePresentation } from "@/components/marketing/legal-page";
import { getLegalPage } from "@/lib/data/legal-page-queries";
import { buildMetadata } from "@/lib/seo/metadata";

// The v3 privacy body (src/components/v3/pages/privacy.tsx) is a draft with
// "CONFIRM BEFORE PUBLICATION" blocks. Until the attorney signs it off, this
// route serves the production policy (database row, or the in-code fallback).
// TODO(human): attorney review required before switching to V3PrivacyPage.
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
