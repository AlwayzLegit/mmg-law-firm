import type { ReactNode } from "react";

import { AttributionCapture } from "@/components/analytics/attribution-capture";
import RootDocument from "@/components/layout/root-document";
import { V3Runtime } from "@/components/v3/v3-runtime";
import { getDictionary } from "@/lib/i18n";
import { LOCALE_HREFLANG, type RoutedLocale } from "@/lib/i18n/config";

import { IntlDock } from "./intl-dock";
import { IntlFooter } from "./intl-footer";
import { IntlHeader } from "./intl-header";

import "@/components/v3/v3.css";
import "@/components/v3/v3-chrome.css";
import "./intl.css";

/**
 * Root layout for a localized section (`/hy`, `/ru`): sets <html lang>,
 * the locale font, and wraps pages in the compact localized header, footer
 * and tap-to-call dock. Each locale folder is its own root so the document
 * language is right without a dynamic segment (which would collide with
 * the English `[guide]` route).
 */
export function IntlRoot({
  locale,
  fontClassName = "",
  children,
}: {
  locale: RoutedLocale;
  /** Locale-only font variables (Armenian: see armenian-font.ts). */
  fontClassName?: string;
  children: ReactNode;
}) {
  const t = getDictionary(locale);
  return (
    <RootDocument
      publicAnalytics
      lang={LOCALE_HREFLANG[locale]}
      htmlClassName={`${fontClassName} lang-${locale}`.trim()}
      skipLabel={t.common.skipToContent}
    >
      <div className="theme-v3 flex min-h-full flex-1 flex-col">
        <IntlHeader locale={locale} />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <IntlFooter locale={locale} />
        <IntlDock locale={locale} />
        <V3Runtime />
        <AttributionCapture />
      </div>
    </RootDocument>
  );
}
