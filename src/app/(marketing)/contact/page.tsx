import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3ConsultPage } from "@/components/v3/pages/consult";

export const metadata = v3Metadata("consult");

export default function ContactPage() {
  return <V3PageShell pageKey="consult" page={V3ConsultPage} />;
}
