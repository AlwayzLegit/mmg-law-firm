export type NavItem = {
  label: string;
  href: string;
};

/** Primary nav rendered in both the desktop header and the mobile sheet. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Practice Areas", href: "/practice-areas" },
  { label: "Locations", href: "/locations" },
  { label: "About", href: "/attorneys/mihran-ghazaryan" },
  { label: "Case Results", href: "/case-results" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];
