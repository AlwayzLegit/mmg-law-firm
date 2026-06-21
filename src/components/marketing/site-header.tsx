import Link from "next/link";
import { Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { getPublicContentFlags } from "@/lib/data/public-content";
import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";
import { PRIMARY_NAV } from "./nav-items";
import { SiteHeaderMobile } from "./site-header-mobile";
import { SiteHeaderScrollShadow } from "./site-header-scroll-shadow";

/**
 * Server-rendered site header. The only interactive surfaces are the
 * mobile sheet (`SiteHeaderMobile`) and the scroll-shadow toggle
 * (`SiteHeaderScrollShadow`, which writes a data attribute). Everything
 * else — brand mark, desktop nav, phone pill, consultation CTA — ships
 * as plain HTML with zero accompanying JS.
 *
 * Per-link active highlighting was removed in the split: knowing which
 * page you're on is a minor cue, and it required pulling `usePathname`
 * (and therefore "use client") across the whole header.
 */
export async function SiteHeader() {
  // Drop nav links to content surfaces that have nothing published yet, so
  // visitors never land on an empty Case Results / Blog page.
  const flags = await getPublicContentFlags();
  const nav = PRIMARY_NAV.filter((item) =>
    item.href === "/case-results"
      ? flags.hasCaseResults
      : item.href === "/blog"
        ? flags.hasBlogPosts
        : true,
  );
  return (
    <header
      data-site-header
      data-scrolled="false"
      className={cn(
        "bg-background/95 sticky top-0 z-40 w-full border-b border-transparent backdrop-blur transition-all",
        "data-[scrolled=true]:border-border data-[scrolled=true]:shadow-sm",
      )}
    >
      <div
        className={cn(
          "container-page flex h-16 items-center justify-between transition-all md:h-20",
          "data-[scrolled=true]:h-14",
        )}
      >
        <Link
          href="/"
          aria-label={`${FIRM.legalName} home`}
          className="flex items-center"
        >
          <BrandMark />
        </Link>

        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:bg-secondary hover:text-primary focus-visible:ring-ring rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${FIRM.phoneTel}`}
            className="group border-border/70 bg-card/60 text-foreground hover:border-primary/30 hover:bg-card hidden items-center gap-2.5 rounded-full border py-1.5 pr-3.5 pl-1.5 text-sm font-semibold tracking-tight shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(20,30,80,0.05)] transition-all hover:shadow-[0_8px_20px_-12px_rgba(20,30,80,0.25)] md:inline-flex"
          >
            <span className="bg-primary text-primary-foreground inline-flex h-7 w-7 items-center justify-center rounded-full transition-transform group-hover:scale-105">
              <Phone className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="tabular-nums">{FIRM.phone}</span>
          </a>

          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden rounded-full sm:inline-flex",
            )}
          >
            Free Consultation
          </Link>

          <SiteHeaderMobile items={nav} />
        </div>
      </div>

      <SiteHeaderScrollShadow />
    </header>
  );
}
