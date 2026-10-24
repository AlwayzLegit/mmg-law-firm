import type { ReactNode } from "react";
import { V3Footer } from "@/components/v3/v3-footer";
import { V3Header } from "@/components/v3/v3-header";
import { V3MobileDock } from "@/components/v3/v3-mobile-dock";
import { V3Runtime } from "@/components/v3/v3-runtime";
import { AttributionCapture } from "@/components/analytics/attribution-capture";

import "@/components/v3/v3.css";
import "@/components/v3/v3-chrome.css";
import "@/components/v3/v3-generated.css";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-v3 flex min-h-full flex-1 flex-col">
      <V3Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <V3Footer />
      <V3MobileDock />
      <V3Runtime />
      <AttributionCapture />
    </div>
  );
}
