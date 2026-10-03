"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type JumpItem = { id: string; label: string };

/**
 * Sticky "on this page" bar under the site header with a scroll-spy. Links
 * are plain anchors (work without JS); the island only tracks the active
 * section. Horizontally scrollable on narrow screens.
 */
export function JumpNav({ items, className }: { items: JumpItem[]; className?: string }) {
  const [active, setActive] = React.useState(items[0]?.id ?? "");

  React.useEffect(() => {
    const onScroll = () => {
      let cur = items[0]?.id ?? "";
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top - 150 <= 0) cur = it.id;
      }
      setActive((prev) => (prev === cur ? prev : cur));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  return (
    <div
      className={cn(
        "bg-paper/92 border-line sticky top-[var(--header-h,82px)] z-30 border-b backdrop-blur-md",
        className,
      )}
    >
      <nav aria-label="On this page" className="container-page no-scrollbar flex gap-1 overflow-x-auto">
        {items.map((it) => {
          const on = it.id === active;
          return (
            <a
              key={it.id}
              href={`#${it.id}`}
              aria-current={on ? "location" : undefined}
              className={cn(
                "flex-none border-b-2 px-3 py-3.5 text-[13px] font-semibold whitespace-nowrap no-underline transition-colors",
                on ? "border-gold text-foreground" : "text-stone hover:text-foreground border-transparent",
              )}
            >
              {it.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
