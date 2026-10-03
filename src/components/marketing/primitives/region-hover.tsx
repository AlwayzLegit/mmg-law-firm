"use client";

import * as React from "react";

/**
 * Tiny interaction island: hovering an element with `data-region` inside
 * `[data-region-source]` highlights matching map dots (and dims the others)
 * inside the same wrapper; hovering a map dot highlights its region row.
 * No React state per item — one delegated listener, class toggles only.
 */
export function RegionHover({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const apply = (region: string | null) => {
      root.querySelectorAll<HTMLElement>("[data-region]").forEach((el) => {
        const match = region != null && el.dataset.region === region;
        el.classList.toggle("is-hot", match);
        el.classList.toggle("is-dim", region != null && !match);
      });
    };
    const onOver = (e: Event) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>("[data-region]");
      apply(t?.dataset.region ?? null);
    };
    const onLeave = () => apply(null);
    root.addEventListener("mouseover", onOver);
    root.addEventListener("mouseleave", onLeave);
    root.addEventListener("focusin", onOver);
    root.addEventListener("focusout", onLeave);
    return () => {
      root.removeEventListener("mouseover", onOver);
      root.removeEventListener("mouseleave", onLeave);
      root.removeEventListener("focusin", onOver);
      root.removeEventListener("focusout", onLeave);
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
