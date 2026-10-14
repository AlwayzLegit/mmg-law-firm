import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3ResultsPage } from "@/components/v3/pages/results";

export const metadata = v3Metadata("results");

export default function CaseResultsPage() {
  return <V3PageShell pageKey="results" page={V3ResultsPage} />;
}
