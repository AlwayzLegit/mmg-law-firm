import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  FileText,
  Gavel,
  Image as ImageIcon,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  Users,
} from "lucide-react";

import CommandPalette from "@/components/admin/command-palette";
import { NavLink } from "@/components/admin/ui/nav-link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM } from "@/lib/constants";
import { getServerSupabase } from "@/lib/supabase/server";

import SignOutButton from "./sign-out-button";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/today", label: "Today", icon: CalendarCheck, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Users, exact: false, badge: "leads" as const },
  { href: "/admin/content/pages", label: "Content", icon: FileText, exact: false, match: "/admin/content" },
  { href: "/admin/case-results", label: "Case Results", icon: Gavel, exact: false },
  { href: "/admin/media", label: "Media", icon: ImageIcon, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: true },
  { href: "/admin/seo", label: "SEO", icon: Search, exact: true },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText, exact: true, ownerOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: false },
];

function initialsOf(name: string | null, fallback: string): string {
  const src = (name ?? "").trim() || fallback;
  return src
    .split(/\s+/)
    .filter((p) => p.length > 1)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || src.slice(0, 2).toUpperCase();
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireAdmin();
  const supabase = await getServerSupabase();
  const { count: newLeads } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "new")
    .is("merged_into", null);

  const nav = NAV.filter((item) => !("ownerOnly" in item && item.ownerOnly) || profile.role === "owner");
  const isOwner = profile.role === "owner";
  const displayName = profile.full_name ?? user.email ?? "Admin";

  return (
    <div className="bg-paper text-foreground min-h-screen font-sans text-sm lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="surface-ink bg-background text-foreground flex flex-col px-3.5 py-[18px] lg:sticky lg:top-0 lg:h-screen">
        <Link href="/admin" className="text-cream flex items-center gap-2.5 px-2 py-1.5 no-underline">
          <Image src="/mmg-logo.png" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-display text-base leading-none font-semibold">
            MMG <span className="text-cream/60 font-medium">Law Firm</span>
          </span>
          <span className="bg-gold/18 text-gold ml-auto rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.12em] uppercase">
            Admin
          </span>
        </Link>

        <div className="mt-[18px]">
          <CommandPalette isOwner={isOwner} variant="rail" />
        </div>

        <nav aria-label="Admin" className="no-scrollbar mt-[18px] flex gap-0.5 overflow-x-auto lg:grid lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            const badge = item.badge === "leads" && (newLeads ?? 0) > 0 ? newLeads : null;
            return (
              <NavLink
                key={item.href}
                href={item.href}
                exact={item.exact}
                className="text-cream/70 hover:bg-cream/6 hover:text-cream flex h-[38px] flex-none items-center gap-3 rounded-[9px] px-2.5 text-[13.5px] font-medium no-underline transition-colors [&_svg]:text-cream/55"
                activeClassName="bg-cream/10 text-cream [&_svg]:text-gold"
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="bg-gold text-ink inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold">
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto hidden gap-2 pt-6 lg:grid">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className="text-cream/60 hover:bg-cream/6 hover:text-cream flex h-9 items-center gap-3 rounded-[9px] px-2.5 text-[13px] no-underline transition-colors"
          >
            <ArrowUpRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
            View public site
          </Link>
          <div className="bg-cream/5 flex items-center gap-2.5 rounded-[10px] p-2.5">
            <span className="bg-gold text-ink inline-flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold">
              {initialsOf(profile.full_name, FIRM.attorneyName)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-cream block truncate text-[13px] font-semibold">{displayName}</span>
              <span className="text-cream/55 flex items-center gap-1 text-[11px] capitalize">
                {profile.role} · <SignOutButton variant="rail" />
              </span>
            </span>
          </div>
        </div>
      </aside>

      <main id="main-content" className="min-w-0 px-5 py-6 lg:px-8 lg:pt-7 lg:pb-16">
        {children}
      </main>
    </div>
  );
}
