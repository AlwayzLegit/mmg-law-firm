import type { ReactNode } from "react";
import { Noto_Serif_Armenian } from "next/font/google";

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

// Georgia (the v3 serif) has no Armenian glyphs; Noto Serif Armenian fills
// them per glyph so Latin digits and the firm name keep the house face.
const notoArmenian = Noto_Serif_Armenian({
  subsets: ["armenian"],
  weight: ["400", "700"],
  variable: "--font-noto-armenian",
  display: "swap",
  preload: false,
});

/**
 * Root layout for a localized section (`/hy`, `/ru`): sets <html lang>,
 * the locale font, and wraps pages in the compact localized header, footer
 * and tap-to-call dock. Each locale folder is its own root so the document
 * language is right without a dynamic segment (which would collide with
 * the English `[guide]` route).
 */
export function IntlRoot({
  locale,
  children,
}: {
  locale: RoutedLocale;
  children: ReactNode;
}) {
  const t = getDictionary(locale);
  return (
    <RootDocument
      publicAnalytics
      lang={LOCALE_HREFLANG[locale]}
      htmlClassName={`${notoArmenian.variable} lang-${locale}`}
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
