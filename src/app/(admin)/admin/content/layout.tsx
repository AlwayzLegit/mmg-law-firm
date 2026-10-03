import { NavLink } from "@/components/admin/ui/nav-link";

const TABS = [
  { href: "/admin/content/pages", label: "Overview", exact: true },
  { href: "/admin/content/practice-areas", label: "Practice areas" },
  { href: "/admin/content/counties", label: "Counties" },
  { href: "/admin/content/cities", label: "Cities" },
  { href: "/admin/content/location-pages", label: "Location pages" },
  { href: "/admin/content/attorneys", label: "Attorneys" },
  { href: "/admin/content/blog", label: "Blog" },
  { href: "/admin/content/agent", label: "Content agent" },
  { href: "/admin/content/testimonials", label: "Testimonials" },
  { href: "/admin/content/legal", label: "Legal" },
  { href: "/admin/content/redirects", label: "Redirects" },
];

/** Tab bar shared by every /admin/content/* screen. */
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav aria-label="Content sections" className="no-scrollbar border-line -mx-5 mb-6 flex gap-1 overflow-x-auto border-b px-5 lg:-mx-8 lg:px-8">
        {TABS.map((t) => (
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
