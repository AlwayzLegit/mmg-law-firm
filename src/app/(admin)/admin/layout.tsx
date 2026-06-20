import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Settings,
  ScrollText,
  LogOut,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { FIRM } from "@/lib/constants";
import SignOutButton from "./sign-out-button";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/leads", label: "Leads", icon: Users, exact: false },
  {
    href: "/admin/content/pages",
    label: "Content",
    icon: FileText,
    exact: false,
  },
  {
    href: "/admin/case-results",
    label: "Case Results",
    icon: FileText,
    exact: true,
  },
  { href: "/admin/media", label: "Media", icon: ImageIcon, exact: true },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    exact: true,
  },
  {
    href: "/admin/audit",
    label: "Audit Log",
    icon: ScrollText,
    exact: true,
    ownerOnly: true,
  },
  { href: "/admin/settings", label: "Settings", icon: Settings, exact: true },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();
  const nav = NAV.filter(
    (item) => !("ownerOnly" in item) || profile.role === "owner",
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-background border-b">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="font-display text-base font-semibold tracking-tight"
            >
              {FIRM.legalName}
            </Link>
            <span className="bg-secondary rounded-md px-2 py-0.5 text-xs font-medium tracking-wide uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {profile.full_name ?? "Admin"} · {profile.role}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="border-border bg-secondary/30 hidden w-56 flex-none border-r lg:block">
          <nav className="px-3 py-6" aria-label="Admin">
            <ul className="grid gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="hover:bg-background flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
                    >
                      <Icon
                        className="text-muted-foreground h-4 w-4"
                        aria-hidden
                      />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="border-border mt-6 border-t pt-6">
              <Link
                href="/"
                target="_blank"
                rel="noopener"
                className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>View public site</span>
              </Link>
            </div>
          </nav>
        </aside>

        <main id="main-content" className="bg-background flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
