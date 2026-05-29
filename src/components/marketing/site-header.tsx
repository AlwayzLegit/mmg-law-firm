import Link from "next/link";
import { Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
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
export function SiteHeader() {
  return (
    <header
      data-site-header
      data-scrolled="false"
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent bg-background/95 backdrop-blur transition-all",
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
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-primary"
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
            className="group hidden items-center gap-2.5 rounded-full border border-border/70 bg-card/60 py-1.5 pl-1.5 pr-3.5 text-sm font-semibold tracking-tight text-foreground shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_1px_2px_rgba(20,30,80,0.05)] transition-all hover:border-primary/30 hover:bg-card hover:shadow-[0_8px_20px_-12px_rgba(20,30,80,0.25)] md:inline-flex"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
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

          <SiteHeaderMobile />
        </div>
      </div>

      <SiteHeaderScrollShadow />
    </header>
  );
}
