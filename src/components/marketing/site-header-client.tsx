"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, Phone, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type { NavItem } from "./nav-items";
import { resolveIcon } from "./primitives/resolve-icon";

export type MenuArea = { slug: string; name: string; icon: string };

type Props = {
  items: readonly NavItem[];
  injury: MenuArea[];
  employment: MenuArea[];
  phone: string;
  phoneTel: string;
  hours: string;
  /** false forces the docked look (used on pages without an ink hero). */
  floating?: boolean;
};

const EASE = "transition-all duration-[350ms] ease-[cubic-bezier(.2,.7,.2,1)]";

export function SiteHeaderClient({ items, injury, employment, phone, phoneTel, hours, floating = true }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [mega, setMega] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Close menus on navigation (state reset keyed on the route, not an effect).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
    setMega(false);
  }
  // Escape closes everything.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMega(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMega = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(false), 160);
  };

  const compact = scrolled || !floating;
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="pointer-events-none sticky top-0 z-40 h-[var(--header-h)] font-sans"
      style={{ ["--header-h" as string]: "82px" }}
    >
      <div className={cn("container-page", EASE, compact ? "!px-0 pt-0" : "pt-3.5")}>
        <header
          className={cn(
            "text-cream pointer-events-auto relative flex items-center justify-between gap-3 border backdrop-blur-[18px] backdrop-saturate-[1.3]",
            EASE,
            compact
              ? "border-cream/8 bg-ink/86 min-h-16 rounded-b-[18px] px-[clamp(14px,3vw,24px)] shadow-[0_10px_30px_-18px_rgba(0,0,0,.6)]"
              : "border-cream/12 bg-ink/62 shadow-float min-h-[68px] rounded-full pr-2.5 pl-4",
          )}
        >
          {/* Brand */}
          <Link href="/" className="text-cream flex flex-none items-center gap-2.5 no-underline" aria-label="MMG Law Firm home">
            <Image src="/mmg-logo.png" alt="" width={30} height={30} priority className="block h-[30px] w-[30px]" />
            <span className="font-display text-[19px] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap">
              MMG <span className="text-cream/60 font-normal">Law Firm</span>
            </span>
          </Link>

          {/* Desktop nav capsule */}
          <nav aria-label="Primary" className="hidden min-w-0 flex-1 justify-center lg:flex">
            <ul className="bg-cream/5 border-cream/7 relative m-0 flex list-none items-center gap-0.5 rounded-full border p-[3px]">
              {items.map((it) => {
                const active = isActive(it.href);
                return (
                  <li
                    key={it.href}
                    className="relative"
                    onMouseEnter={it.hasMenu ? openMega : closeMega}
                    onMouseLeave={it.hasMenu ? closeMega : undefined}
                  >
                    <Link
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      aria-haspopup={it.hasMenu ? "true" : undefined}
                      aria-expanded={it.hasMenu ? mega : undefined}
                      onFocus={it.hasMenu ? openMega : undefined}
                      className={cn(
                        "relative z-[1] inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-medium whitespace-nowrap no-underline transition-colors duration-200",
                        active ? "text-cream" : "text-cream/78 hover:text-cream hover:bg-cream/8",
                      )}
                    >
                      {it.label}
                      {it.hasMenu ? (
                        <ChevronDown
                          className={cn("h-3 w-3 opacity-55 transition-transform duration-200", mega && "rotate-180")}
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                    {active ? (
                      <span aria-hidden className="bg-gold absolute -bottom-px left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-sm" />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right cluster */}
          <div className="flex flex-none items-center gap-2">
            <a
              href={`tel:${phoneTel}`}
              aria-label={`Call ${phone}`}
              className="border-cream/14 bg-cream/4 text-cream hover:border-gold/60 hover:bg-gold/10 inline-flex h-10 items-center gap-2 rounded-full border px-[5px] text-[13.5px] font-semibold no-underline transition-colors min-[1180px]:pr-3.5 min-[1180px]:pl-1.5"
            >
              <span className="bg-gold text-ink inline-flex h-7 w-7 flex-none items-center justify-center rounded-full">
                <Phone className="h-[13px] w-[13px]" aria-hidden />
              </span>
              <span className="hidden tabular-nums min-[1180px]:inline">{phone}</span>
            </a>
            <Link
              href="/contact"
              className="border-gold/55 text-cream hover:bg-gold/16 hover:border-gold hidden h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap no-underline transition-colors sm:inline-flex"
            >
              Free consultation
              <ArrowRight className="text-gold h-[13px] w-[13px]" aria-hidden />
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="border-cream/14 bg-cream/4 text-cream inline-flex h-10 w-10 items-center justify-center rounded-full border lg:hidden"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Menu className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>

          {/* Mega menu */}
          <div
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
            className={cn(
              "border-cream/10 bg-ink/96 text-cream absolute top-[calc(100%+10px)] left-1/2 hidden w-[min(960px,calc(100vw-32px))] -translate-x-1/2 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_240px] gap-5 rounded-[18px] border p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,.7)] backdrop-blur-xl lg:grid",
              !mega && "lg:hidden",
            )}
          >
            <div>
              <p className="text-gold micro-label px-2.5 tracking-[0.16em]">Personal injury</p>
              <ul className="m-0 mt-2 grid list-none grid-cols-2 gap-0.5 p-0">
                {injury.map((a) => (
                  <MenuLink key={a.slug} area={a} />
                ))}
              </ul>
            </div>
            <div>
              <p className="text-gold micro-label px-2.5 tracking-[0.16em]">Employment</p>
              <ul className="m-0 mt-2 grid list-none gap-0.5 p-0">
                {employment.map((a) => (
                  <MenuLink key={a.slug} area={a} />
                ))}
              </ul>
              <Link href="/practice-areas" className="text-gold mx-2.5 mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline hover:underline">
                All {injury.length + employment.length} practice areas
                <ArrowRight className="h-[13px] w-[13px]" aria-hidden />
              </Link>
            </div>
            <Link href="/contact" className="bg-ink-soft text-cream relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-xl no-underline">
              <Image src="/brand/working-the-file.webp" alt="" fill sizes="240px" className="object-cover opacity-75" />
              <span aria-hidden className="from-ink/95 to-ink/10 absolute inset-0 bg-gradient-to-t to-60%" />
              <span className="relative p-4">
                <span className="text-gold micro-label block">Not sure where it fits?</span>
                <span className="font-display mt-1.5 block text-xl leading-[1.15] font-semibold">Tell us what happened. We&apos;ll sort it out.</span>
                <span className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
                  Free consultation <ArrowRight className="h-3 w-3" aria-hidden />
                </span>
              </span>
            </Link>
          </div>
        </header>

        {/* Mobile menu card */}
        <nav
          id="mobile-menu"
          aria-label="Primary"
          className={cn(
            "border-cream/10 bg-ink/96 text-cream pointer-events-auto mt-2 rounded-[18px] border p-2.5 shadow-[0_30px_60px_-30px_rgba(0,0,0,.7)] backdrop-blur-xl lg:hidden",
            compact && "mx-[clamp(12px,3vw,24px)]",
            !menuOpen && "hidden",
          )}
        >
          <ul className="m-0 grid list-none gap-0.5 p-0">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  aria-current={isActive(it.href) ? "page" : undefined}
                  className={cn(
                    "hover:bg-cream/7 flex items-center justify-between rounded-[10px] px-3.5 py-[13px] text-base font-medium no-underline",
                    isActive(it.href) ? "text-gold" : "text-cream",
                  )}
                >
                  <span>{it.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                </Link>
              </li>
            ))}
            <li className="border-cream/10 mt-1.5 border-t px-1 pt-1.5 pb-1">
              <a href={`tel:${phoneTel}`} className="text-gold flex items-center gap-2.5 p-2.5 text-base font-semibold no-underline">
                <Phone className="h-[15px] w-[15px]" aria-hidden />
                {phone}
                <span className="text-cream/50 ml-auto text-xs font-medium">{hours}</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

function MenuLink({ area }: { area: MenuArea }) {
  return (
    <li>
      <Link
        href={`/practice-areas/${area.slug}`}
        className="text-cream/85 hover:bg-cream/7 hover:text-cream flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13.5px] no-underline transition-colors"
      >
        {React.createElement(resolveIcon(area.icon), {
          className: "text-gold h-[15px] w-[15px] opacity-90",
          "aria-hidden": true,
        })}
        <span>{area.name}</span>
      </Link>
    </li>
  );
}
