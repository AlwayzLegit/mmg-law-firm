import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";
import { V3HomePage } from "@/components/v3/pages/home";

export const metadata = v3Metadata("home");

export const revalidate = 3600;

export default function HomePage() {
  return <V3PageShell pageKey="home" page={V3HomePage} />;
}
