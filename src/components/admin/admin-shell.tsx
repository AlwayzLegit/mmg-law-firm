import Link from "next/link";
import type { ReactNode } from "react";

import CommandPalette from "@/components/admin/command-palette";
import { AdminMobileNav, AdminSidebar } from "@/components/admin/admin-nav";
import SignOutButton from "@/app/(admin)/admin/sign-out-button";

/**
 * Admin chrome: top bar, charcoal sidebar (desktop) or drawer (mobile), and
 * the content area. Presentational — the layout does the auth and passes
 * the profile in.
 */
export default function AdminShell({
  name,
  role,
  children,
}: {
  name: string | null;
  role: string;
  children: ReactNode;
}) {
  const isOwner = role === "owner";
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border bg-card sticky top-0 z-40 border-b">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <AdminMobileNav isOwner={isOwner} />
            <Link
              href="/admin"
              className="flex items-baseline gap-2"
              aria-label="MMG Law Firm admin home"
            >
              <span className="font-display text-xl tracking-tight">MMG</span>
              <span className="text-muted-foreground hidden text-[11px] font-semibold tracking-[0.22em] uppercase sm:inline">
                Law Firm
              </span>
            </Link>
            <span className="bg-secondary text-secondary-foreground rounded-sm px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] uppercase">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <CommandPalette isOwner={isOwner} />
            <span className="text-muted-foreground hidden md:inline">
              {name ?? "Admin"}{" "}
              <span className="text-muted-foreground/60">· {role}</span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AdminSidebar isOwner={isOwner} />
        <main
          id="main-content"
          className="bg-background min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
