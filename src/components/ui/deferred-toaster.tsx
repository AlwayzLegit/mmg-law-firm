"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { needsToastHost } from "./toast-route-policy";

const Toaster = dynamic(() => import("./sonner").then((m) => m.Toaster), { ssr: false });

/**
 * Mounts the sonner toast host once the page is idle. Toasts only follow a
 * user action (a form submit, a copy button). The three core accident hubs
 * use inline feedback and don't need this download. Once mounted, preserve
 * the host across navigation so existing notifications aren't interrupted.
 */
export function DeferredToaster(props: React.ComponentProps<typeof Toaster>) {
  const [ready, setReady] = React.useState(false);
  const needed = needsToastHost(usePathname());

  React.useEffect(() => {
    if (ready || !needed) return;
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
  }, [needed, ready]);

  return ready ? <Toaster {...props} /> : null;
}
