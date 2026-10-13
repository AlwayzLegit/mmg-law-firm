import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3PrivacyPage } from "@/components/v3/pages/privacy";

export const metadata = v3Metadata("privacy");

export default function LegalPrivacyPage() {
  return <V3PageShell pageKey="privacy" page={V3PrivacyPage} />;
}
