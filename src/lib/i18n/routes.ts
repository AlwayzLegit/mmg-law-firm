import { env } from "@/lib/env";
import { canonicalUrl } from "@/lib/seo/canonical";

import {
  DEFAULT_LOCALE,
  LOCALE_HREFLANG,
  ROUTED_LOCALES,
  localePath,
  type Locale,
  type RoutedLocale,
} from "./config";

/** The localized page set. Keys are the English paths they mirror. */
export const LOCALIZED_PAGES = {
  "/": { key: "home" },
  "/contact": { key: "contact" },
} as const;

export type LocalizedPageKey =
  (typeof LOCALIZED_PAGES)[keyof typeof LOCALIZED_PAGES]["key"];

export const LOCALIZED_PATHS = Object.keys(LOCALIZED_PAGES) as Array<
  keyof typeof LOCALIZED_PAGES
>;

/**
 * Whether the localized pages are published: indexable, in the sitemap and
 * linked from the switcher. Until then they render for attorney review only.
 */
export function localePagesLive(): boolean {
  // Literal process.env read first so Next can inline it client-side.
  const v = (
    process.env.NEXT_PUBLIC_LOCALE_PAGES_LIVE ??
    env.NEXT_PUBLIC_LOCALE_PAGES_LIVE ??
    ""
  )
    .trim()
    .toLowerCase();
  return v === "1" || v === "true";
}

export function englishPathFor(key: LocalizedPageKey): keyof typeof LOCALIZED_PAGES {
  return key === "home" ? "/" : "/contact";
}

/**
 * hreflang alternates for an English path that has localized versions, or
 * undefined when the page has none or the locale pages are not live.
 * Shape matches Next's `alternates.languages`.
 */
export function localeAlternates(
  enPath: string,
): Record<string, string> | undefined {
  if (!localePagesLive()) return undefined;
  if (!(enPath in LOCALIZED_PAGES)) return undefined;
  const out: Record<string, string> = {
    [LOCALE_HREFLANG[DEFAULT_LOCALE]]: canonicalUrl(enPath),
  };
  for (const loc of ROUTED_LOCALES) {
    out[LOCALE_HREFLANG[loc]] = canonicalUrl(localePath(loc, enPath));
  }
  out["x-default"] = canonicalUrl(enPath);
  return out;
}

/** Switcher links for the page at `enPath`, current locale first-class. */
export function switcherLinks(
  enPath: string,
): Array<{ locale: Locale; href: string }> {
  const base = enPath in LOCALIZED_PAGES ? enPath : "/";
  return [
    { locale: DEFAULT_LOCALE, href: base },
    ...ROUTED_LOCALES.map((loc: RoutedLocale) => ({
      locale: loc,
      href: localePath(loc, base),
    })),
  ];
}
