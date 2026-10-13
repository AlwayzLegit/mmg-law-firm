import { V3PageShell, v3Metadata } from "@/components/v3/v3-page-shell";

export const metadata = v3Metadata("reviews");

export default function ReviewsPage() {
  return <V3PageShell pageKey="reviews" />;
}
