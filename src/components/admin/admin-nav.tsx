"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarCheck,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  KanbanSquare,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  Menu,
  Newspaper,
  Scale,
  ScrollText,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match only the exact path (default: the path and everything under it). */
  exact?: boolean;
  ownerOnly?: boolean;
};

type NavGroup = { label: string; items: NavItem[] };

/** Grouped by what the person is doing: intake, publishing, growth, admin. */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Intake",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/today", label: "Today", icon: CalendarCheck },
      { href: "/admin/leads", label: "Leads", icon: Users, exact: true },
      { href: "/admin/leads/board", label: "Pipeline", icon: KanbanSquare },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/content/pages", label: "Pages", icon: FileText },
      { href: "/admin/content/blog", label: "Blog", icon: Newspaper },
      {
        href: "/admin/content/location-pages",
        label: "Locations",
        icon: MapPin,
      },
      { href: "/admin/case-results", label: "Case results", icon: Scale },
      { href: "/admin/media", label: "Media", icon: ImageIcon },
      { href: "/admin/content/agent", label: "Content agent", icon: Bot },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/seo", label: "SEO", icon: Search },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      {
        href: "/admin/audit",
        label: "Audit log",
        icon: ScrollText,
        ownerOnly: true,
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavList({
  isOwner,
  onNavigate,
}: {
  isOwner: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="grid gap-6">
      {ADMIN_NAV.map((group) => {
        const items = group.items.filter((i) => !i.ownerOnly || isOwner);
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="text-sidebar-foreground/50 mb-2 px-3 text-[11px] font-semibold tracking-[0.18em] uppercase">
              {group.label}
            </p>
            <ul className="grid gap-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 flex-none",
                          active
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/50",
                        )}
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div className="border-sidebar-border border-t pt-4">
        <Link
          href="/"
          target="_blank"
          rel="noopener"
          onClick={onNavigate}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span>View public site</span>
        </Link>
      </div>
    </nav>
  );
}

/** Desktop sidebar (lg and up). */
export function AdminSidebar({ isOwner }: { isOwner: boolean }) {
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 flex-none border-r lg:block">
      <div className="sticky top-0 max-h-screen overflow-y-auto px-3 py-6">
        <NavList isOwner={isOwner} />
      </div>
    </aside>
  );
}

/** Hamburger + slide-in drawer for phones and tablets. */
export function AdminMobileNav({ isOwner }: { isOwner: boolean }) {
  const [open, setOpen] = React.useState(false);

  // Links close the drawer themselves (onNavigate); Escape closes it too,
  // and the page can't scroll behind it while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="hover:bg-accent inline-flex h-9 w-9 items-center justify-center rounded-md lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            id="admin-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col shadow-2xl"
          >
            <div className="border-sidebar-border flex h-14 items-center justify-between border-b px-4">
              <span className="font-display text-base tracking-tight">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="hover:bg-sidebar-accent inline-flex h-9 w-9 items-center justify-center rounded-md"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-5">
              <NavList isOwner={isOwner} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
