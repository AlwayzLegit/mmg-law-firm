import type { ReactNode } from "react";

import { IntlRoot } from "@/components/intl/intl-root";

export { viewport } from "@/components/layout/root-document";

export default function Layout({ children }: { children: ReactNode }) {
  return <IntlRoot locale="hy">{children}</IntlRoot>;
}
