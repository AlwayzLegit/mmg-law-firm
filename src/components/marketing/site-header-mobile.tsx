"use client";

import * as React from "react";
import Link from "next/link";
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

import { PRIMARY_NAV } from "./nav-items";

/**
 * Client island for the mobile menu sheet. Server `SiteHeader` renders
 * everything else statically; this is the only piece that actually needs
 * client interactivity (open/close state + portal-rendered side panel).
 */
export function SiteHeaderMobile() {
  const [open, setOpen] = React.useState(false);
  const closeMenu = React.useCallback(() => setOpen(false), []);

  return (
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
          <SheetTitle className="font-display">{FIRM.legalName}</SheetTitle>
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
  );
}
