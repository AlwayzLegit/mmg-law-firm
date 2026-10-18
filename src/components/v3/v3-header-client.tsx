"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Behaviour for the server-rendered V3Header: opens/closes dropdown panels
 * (click, Escape, outside click), closes everything on navigation, and marks
 * the active top-level item for the gold underline.
 */
export function V3HeaderClient() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-v3-header]");
    if (!header) return;

    const close = () => {
      header.removeAttribute("data-open");
      header.querySelectorAll("[data-dd-btn]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    };
    const open = (name: string) => {
      header.setAttribute("data-open", name);
      header.querySelectorAll<HTMLElement>("[data-dd-btn]").forEach((b) =>
        b.setAttribute("aria-expanded", String(b.dataset.ddBtn === name)),
      );
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const btn = t.closest<HTMLElement>("[data-dd-btn]");
      if (btn && header.contains(btn)) {
        const name = btn.dataset.ddBtn!;
        if (header.getAttribute("data-open") === name) close();
        else open(name);
        return;
      }
      if (!t.closest("[data-dd-panel]")) close();
      // Following any link inside the header closes menus.
      if (t.closest("a")) {
        close();
        header.querySelectorAll<HTMLDetailsElement>("details[data-mobile-nav]").forEach((d) => (d.open = false));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const name = header.getAttribute("data-open");
      if (name) {
        close();
        header.querySelector<HTMLElement>(`[data-dd-btn="${name}"]`)?.focus();
      }
      header.querySelectorAll<HTMLDetailsElement>("details[data-mobile-nav]").forEach((d) => (d.open = false));
    };
    const onMobileToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.matches("[data-mobile-nav]")) document.documentElement.style.overflow = d.open ? "hidden" : "";
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    header.addEventListener("toggle", onMobileToggle, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      header.removeEventListener("toggle", onMobileToggle, true);
    };
  }, []);

  // Close menus + mark the active item whenever the route changes.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-v3-header]");
    if (!header) return;
    header.removeAttribute("data-open");
    header.querySelectorAll<HTMLDetailsElement>("details[data-mobile-nav]").forEach((d) => (d.open = false));
    document.documentElement.style.overflow = "";
    // The most specific match wins, so a city × specialty page underlines the
    // specialty item rather than both it and Locations.
    const items = Array.from(header.querySelectorAll<HTMLElement>("[data-nav-match]"));
    const score = (el: HTMLElement) =>
      el.dataset
        .navMatch!.split(",")
        .filter((p) => pathname === p || pathname.startsWith(p + "/"))
        .reduce((best, p) => Math.max(best, p.length), 0);
    const scores = items.map(score);
    const top = Math.max(0, ...scores);
    items.forEach((el, i) => {
      if (top > 0 && scores[i] === top) el.setAttribute("data-active", "");
      else el.removeAttribute("data-active");
    });
  }, [pathname]);

  return null;
}
