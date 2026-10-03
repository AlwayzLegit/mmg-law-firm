import { NotFoundView } from "@/components/marketing/not-found-view";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata = {
  title: "Page Not Found",
  description: "We could not find the page you were looking for.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        <NotFoundView />
      </main>
      <SiteFooter />
    </>
  );
}
