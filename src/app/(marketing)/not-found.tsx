import { NotFoundView } from "@/components/marketing/not-found-view";

export const metadata = {
  title: "Page Not Found",
  description: "We could not find the page you were looking for.",
  robots: { index: false, follow: false },
};

/**
 * Route-group not-found for /(marketing). The root /src/app/not-found.tsx
 * renders its own SiteHeader + SiteFooter for the rare case of a 404 outside
 * any layout group (e.g. a bare /foo path). When the 404 originates inside
 * /(marketing) — every public marketing route — Next.js wraps THIS file with
 * the (marketing) layout, which already provides the header and footer.
 * Rendering them again here would stack two of each (the bug seen by QA).
 */
export default function NotFound() {
  return <NotFoundView />;
}
