import type { Metadata } from "next";

import { buildMetadata } from "@/lib/seo/metadata";

import { localePath, LOCALE_OG, type RoutedLocale } from "./config";
import { getDictionary } from "./index";
import { englishPathFor, localeAlternates, localePagesLive, type LocalizedPageKey } from "./routes";

/**
 * Metadata for a localized page: localized title/description, self
 * canonical under the locale prefix, Open Graph locale, and hreflang
 * alternates. Until the locale pages are published they are `noindex`
 * so the attorney can review them on the live URL without Google
 * indexing unreviewed legal copy.
 */
export function intlMetadata(locale: RoutedLocale, key: LocalizedPageKey): Metadata {
  const t = getDictionary(locale);
  const enPath = englishPathFor(key);
  const live = localePagesLive();
  const meta = buildMetadata({
    title: key === "home" ? t.meta.homeTitle : t.meta.contactTitle,
    description: key === "home" ? t.meta.homeDescription : t.meta.contactDescription,
    path: localePath(locale, enPath),
    noindex: !live,
  });
  const languages = localeAlternates(enPath);
  if (languages) meta.alternates = { ...meta.alternates, languages };
  meta.openGraph = { ...meta.openGraph, locale: LOCALE_OG[locale] };
  return meta;
}
