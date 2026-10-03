import { FIRM } from "@/lib/constants";
import { PRACTICE_AREAS } from "@/lib/data/practice-areas";
import { getPublicContentFlags } from "@/lib/data/public-content";

import { PRIMARY_NAV } from "./nav-items";
import { SiteHeaderClient, type MenuArea } from "./site-header-client";

/**
 * Site header (redesign v2). The server resolves which nav items exist and
 * the practice-area groups for the mega-menu; `SiteHeaderClient` handles the
 * floating→docked scroll state, hover menu and mobile menu.
 *
 * Layout contract: the header is `position: sticky` and 82px tall in flow;
 * hero sections opt in to flowing under it with the `.under-header` utility
 * (negative top margin + matching padding).
 */
export async function SiteHeader({ floating = true }: { floating?: boolean }) {
  // Drop nav links to content surfaces that have nothing published yet, so
  // visitors never land on an empty Case Results / Blog page.
  const flags = await getPublicContentFlags();
  const nav = PRIMARY_NAV.filter((item) =>
    item.href === "/case-results"
      ? flags.hasCaseResults
      : item.href === "/blog"
        ? flags.hasBlogPosts
        : true,
  );
  const ordered = [...PRACTICE_AREAS].sort((a, b) => a.displayOrder - b.displayOrder);
  const toMenu = (p: (typeof ordered)[number]): MenuArea => ({
    slug: p.slug,
    name: p.name,
    icon: p.icon,
  });
  return (
    <SiteHeaderClient
      items={nav}
      injury={ordered.filter((p) => p.category !== "employment").map(toMenu)}
      employment={ordered.filter((p) => p.category === "employment").map(toMenu)}
      phone={FIRM.phone}
      phoneTel={FIRM.phoneTel}
      hours={FIRM.hours}
      floating={floating}
    />
  );
}
