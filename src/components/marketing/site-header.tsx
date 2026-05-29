"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

const PRIMARY_NAV = [
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "Locations", href: "/locations" },
  { label: "About", href: "/attorneys/mihran-ghazaryan" },
  { label: "Case Results", href: "/case-results" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-transparent bg-background/95 backdrop-blur transition-all",
        scrolled && "border-border shadow-sm",
      )}
    >
      <div
        className={cn(
          "container-page flex items-center justify-between transition-all",
          scrolled ? "h-14" : "h-16 md:h-20",
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
            {PRIMARY_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-primary",
                      active && "text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "lg:hidden",
              )}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle className="font-display">
                  {FIRM.legalName}
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile primary" className="px-4 pb-6">
                <ul className="grid gap-1">
                  {PRIMARY_NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className="block rounded-md px-3 py-3 text-base font-medium hover:bg-secondary hover:text-primary"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid gap-3">
                  <Link
                    href="/contact"
                    onClick={closeMenu}
                    className={buttonVariants()}
                  >
                    Free Consultation
                  </Link>
                  <a
                    href={`tel:${FIRM.phoneTel}`}
                    className="flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
                  >
                    <Phone className="h-4 w-4 text-primary" aria-hidden />
                    <span>{FIRM.phone}</span>
                  </a>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
