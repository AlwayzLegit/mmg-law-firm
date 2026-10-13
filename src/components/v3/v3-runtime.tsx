"use client";

import { useEffect } from "react";

/**
 * Wires up the interactive regions of the v3 design pages with one delegated
 * listener (no per-component state):
 *
 * - `data-v3-r="key"`       a region; hidden while it carries `data-off`
 * - `data-v3-on="a b"`      trigger: show regions a and b
 * - `data-v3-off="c"`       trigger: hide region c
 * - `data-v3-tog="d"`       trigger: flip region d
 * - `data-v3-self`          trigger fires only when clicked directly (backdrops)
 * - `data-v3-aria="key"`    keep aria-expanded in sync with region `key`
 * - `data-v3-sel="key"`     keep aria-selected in sync with region `key`
 * - `data-v3-print`         print the page
 *
 * All region content is server-rendered, so it stays crawlable and works
 * as plain HTML before hydration.
 */
export function V3Runtime() {
  useEffect(() => {
    // State lives in the DOM only (region `data-off`, trigger aria attrs), so
    // client-side navigation to another page can never inherit stale state.
    let lastTrigger: HTMLElement | null = null;

    const regions = (key: string) =>
      document.querySelectorAll<HTMLElement>(`[data-v3-r="${CSS.escape(key)}"]`);
    const ariaOf = (key: string) =>
      document.querySelectorAll<HTMLElement>(
        `[data-v3-aria="${CSS.escape(key)}"],[data-v3-sel="${CSS.escape(key)}"]`,
      );

    const isOpen = (key: string): boolean => {
      const el = regions(key)[0];
      if (el) return !el.hasAttribute("data-off");
      const t = ariaOf(key)[0];
      if (t) {
        const v = t.getAttribute("aria-expanded") ?? t.getAttribute("aria-selected");
        return v === "true";
      }
      return false;
    };

    const set = (key: string, open: boolean) => {
      regions(key).forEach((el) => {
        if (open) el.removeAttribute("data-off");
        else el.setAttribute("data-off", "");
      });
      ariaOf(key).forEach((el) => {
        el.setAttribute(el.dataset.v3Aria ? "aria-expanded" : "aria-selected", String(open));
      });
    };

    const sync = () => {
      // Lock page scroll while a dialog region is open.
      const dialogOpen = Array.from(
        document.querySelectorAll<HTMLElement>("[data-v3-r]:not([data-off])"),
      ).some((r) => r.querySelector('[role="dialog"]'));
      document.documentElement.style.overflow = dialogOpen ? "hidden" : "";
    };

    const focusDialog = () => {
      const open = Array.from(
        document.querySelectorAll<HTMLElement>("[data-v3-r]:not([data-off])"),
      )
        .map((r) => r.querySelector<HTMLElement>('[role="dialog"]'))
        .filter(Boolean) as HTMLElement[];
      const dlg = open[open.length - 1];
      if (!dlg) return;
      const f = dlg.querySelector<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (f ?? dlg).focus({ preventScroll: true });
    };

    const words = (s?: string) => (s ? s.split(/\s+/).filter(Boolean) : []);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const printer = target.closest<HTMLElement>("[data-v3-print]");
      if (printer) {
        e.preventDefault();
        window.print();
        return;
      }
      const el = target.closest<HTMLElement>("[data-v3-on],[data-v3-off],[data-v3-tog]");
      if (!el) return;
      if (el.hasAttribute("data-v3-self") && target !== el) return;
      if (el.tagName === "A") e.preventDefault();
      const wasDialog = !!document.querySelector("[data-v3-r]:not([data-off]) [role='dialog']");
      words(el.dataset.v3Off).forEach((k) => set(k, false));
      words(el.dataset.v3Tog).forEach((k) => set(k, !isOpen(k)));
      words(el.dataset.v3On).forEach((k) => set(k, true));
      sync();
      const nowDialog = !!document.querySelector("[data-v3-r]:not([data-off]) [role='dialog']");
      if (nowDialog && !wasDialog) {
        lastTrigger = el;
        focusDialog();
      } else if (!nowDialog && wasDialog) {
        lastTrigger?.focus({ preventScroll: true });
        lastTrigger = null;
      } else if (nowDialog) {
        focusDialog();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      let closed = false;
      document.querySelectorAll<HTMLElement>("[data-v3-r]:not([data-off])").forEach((r) => {
        if (r.querySelector('[role="dialog"]')) {
          set(r.dataset.v3R!, false);
          closed = true;
        }
      });
      if (closed) {
        sync();
        lastTrigger?.focus({ preventScroll: true });
        lastTrigger = null;
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, []);

  return null;
}
