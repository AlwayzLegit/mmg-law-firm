import type { ReactNode } from "react";
import RootDocument from "@/components/layout/root-document";
import { MarketingShell } from "@/components/layout/marketing-shell";

export { metadata, viewport } from "@/components/layout/root-document";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <RootDocument publicAnalytics>
      <MarketingShell>{children}</MarketingShell>
    </RootDocument>
  );
}
