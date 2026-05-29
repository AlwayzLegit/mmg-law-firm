"use client";

import * as React from "react";

/**
 * Tiny client island that toggles a `data-scrolled` attribute on the
 * nearest <header> ancestor when the viewport scrolls past 8px. Rendering
 * nothing keeps it out of the React tree's paint cost; the header reacts
 * via CSS attribute selectors on `[data-scrolled="true"]`.
 */
export function SiteHeaderScrollShadow() {
  React.useEffect(() => {
    const header = document.querySelector<HTMLElement>("header[data-site-header]");
    if (!header) return;
    const apply = () => {
      header.dataset.scrolled = window.scrollY > 8 ? "true" : "false";
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    return () => window.removeEventListener("scroll", apply);
  }, []);

  return null;
}
