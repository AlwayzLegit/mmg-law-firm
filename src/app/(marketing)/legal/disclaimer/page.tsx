import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3DisclosuresPage } from "@/components/v3/pages/disclosures";

export const metadata = v3Metadata("disclosures");

export default function LegalDisclaimerPage() {
  return <V3PageShell pageKey="disclosures" page={V3DisclosuresPage} />;
}
