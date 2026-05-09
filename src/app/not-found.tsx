import Link from "next/link";

import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";

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
        <section className="container-page flex flex-col items-center justify-center py-24 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            404
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight md:text-5xl">
            We couldn&apos;t find that page.
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            The link may be outdated, or the page has moved. If you&apos;re
            trying to reach our office, the fastest way is by phone.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className={buttonVariants({ size: "lg" })}>
              Return home
            </Link>
            <a
              href={`tel:${FIRM.phoneTel}`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Call {FIRM.phone}
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
