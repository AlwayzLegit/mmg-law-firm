import type { ReactNode } from "react";

import { MobileCtaBar } from "@/components/marketing/mobile-cta-bar";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1 pb-14 md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileCtaBar />
    </>
  );
}
