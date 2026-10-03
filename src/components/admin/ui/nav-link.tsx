"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Rail / tab link that knows whether it is active. `exact` matches the path
 * only; otherwise any descendant path counts (so /admin/leads/123 keeps
 * "Leads" lit).
 */
export function NavLink({
  href,
  exact = false,
  className,
  activeClassName,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & {
  href: string;
  exact?: boolean;
  activeClassName?: string;
}) {
  const pathname = usePathname();
  const base = href.split("?")[0];
  const active = exact ? pathname === base : pathname === base || pathname.startsWith(base + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cn(className, active && activeClassName)}
      {...rest}
    >
      {children}
    </Link>
  );
}
