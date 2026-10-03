import { NavLink } from "@/components/admin/ui/nav-link";
import { requireAdmin } from "@/lib/auth/require-admin";

/** Tab bar shared by every /admin/settings/* screen. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  const tabs = [
    { href: "/admin/settings", label: "Team & security", exact: true },
    { href: "/admin/settings/firm", label: "Firm" },
    { href: "/admin/settings/templates", label: "Message templates" },
    ...(profile.role === "owner" ? [{ href: "/admin/settings/api-keys", label: "API keys" }] : []),
  ];
  return (
    <div>
      <nav aria-label="Settings sections" className="no-scrollbar border-line -mx-5 mb-6 flex gap-1 overflow-x-auto border-b px-5 lg:-mx-8 lg:px-8">
        {tabs.map((t) => (
          <NavLink
            key={t.href}
            href={t.href}
            exact={t.exact}
            className="text-stone hover:text-foreground flex-none border-b-2 border-transparent px-2.5 py-3 text-[13px] font-semibold whitespace-nowrap no-underline transition-colors"
            activeClassName="border-gold text-foreground"
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}
