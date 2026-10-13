import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";

export const metadata = v3Metadata("home");

export const revalidate = 3600;

export default function HomePage() {
  return <V3PageShell pageKey="home" />;
}
