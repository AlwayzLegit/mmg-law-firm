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
          className="flex items-baseline gap-1.5"
        >
          <span className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {FIRM.legalName.replace(" Law Firm", "")}
          </span>
          <span className="font-display text-sm font-medium text-primary sm:text-base">
            Law
          </span>
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

        <div className="flex items-center gap-2">
          <a
            href={`tel:${FIRM.phoneTel}`}
            className="hidden items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary md:inline-flex"
          >
            <Phone className="h-4 w-4 text-primary" aria-hidden />
            <span>{FIRM.phone}</span>
          </a>

          <Link
            href="/contact"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden sm:inline-flex",
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
