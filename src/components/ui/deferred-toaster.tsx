"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const Toaster = dynamic(() => import("./sonner").then((m) => m.Toaster), { ssr: false });

/**
 * Mounts the sonner toast host once the page is idle. Toasts only follow a
 * user action (a form submit, a copy button), so the host is always ready
 * by then, and sonner stays out of the initial bundle on every page.
 */
export function DeferredToaster(props: React.ComponentProps<typeof Toaster>) {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  return ready ? <Toaster {...props} /> : null;
}
