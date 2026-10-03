export type NavItem = {
  label: string;
  href: string;
  /** Marks the item that opens the practice-areas mega-menu on desktop. */
  hasMenu?: boolean;
};

/** Primary nav rendered in both the desktop header and the mobile menu. */
export const PRIMARY_NAV: readonly NavItem[] = [
  { label: "Practice Areas", href: "/practice-areas", hasMenu: true },
  { label: "Locations", href: "/locations" },
  { label: "About", href: "/attorneys/mihran-ghazaryan" },
  { label: "Case Results", href: "/case-results" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];
