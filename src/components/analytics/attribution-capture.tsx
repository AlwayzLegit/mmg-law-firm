"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { captureFirstTouchInBrowser } from "@/lib/analytics/attribution";

/**
 * Records the first touch of a visit (campaign params, external referrer,
 * landing page) so the lead form can attribute a case to the channel that
 * brought the visitor, not to the page the form happened to be on. Runs on
 * every public navigation; the capture itself only writes when there is
 * nothing stored or a new campaign click arrives.
 */
export function AttributionCapture() {
  const pathname = usePathname();
  useEffect(() => {
    captureFirstTouchInBrowser();
  }, [pathname]);
  return null;
}
