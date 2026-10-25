/**
 * Internationalization configuration.
 *
 * `LOCALES` is every language the dictionaries know about. `ROUTED_LOCALES`
 * is the subset that has its own pages (`/hy`, `/ru`, `/es`). Armenian and
 * Russian are languages the attorney speaks (FIRM.languages); Spanish is
 * offered for Los Angeles reach, and its copy is written so it never
 * implies a Spanish-speaking attorney (see dictionaries/es.ts). How
 * Spanish-speaking callers are served is an open owner decision (spec §18).
 *
 * The routed pages exist in every environment but stay `noindex`, out of
 * the sitemap and out of the language switcher until
 * `NEXT_PUBLIC_LOCALE_PAGES_LIVE=1` — the attorney reviews the
 * translations on the live URL first (CRPC §7.1 compliance in another
 * language is not a mechanical translation).
 *
 * Keep `en` first — it is the default/fallback.
 */
export const LOCALES = ["en", "es", "hy", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Locales with their own routes under `/<locale>`. */
export const ROUTED_LOCALES = ["hy", "ru", "es"] as const satisfies readonly Locale[];

export type RoutedLocale = (typeof ROUTED_LOCALES)[number];

/** Display names: `label` in English, `native` in the language itself. */
export const LOCALE_NAMES: Record<Locale, { label: string; native: string }> = {
  en: { label: "English", native: "English" },
  es: { label: "Spanish", native: "Español" },
  hy: { label: "Armenian", native: "Հայերեն" },
  ru: { label: "Russian", native: "Русский" },
};

/** BCP-47 tags for <html lang> / hreflang. */
export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: "en-US",
  es: "es",
  hy: "hy",
  ru: "ru",
};

/** Open Graph locale codes. */
export const LOCALE_OG: Record<Locale, string> = {
  en: "en_US",
  es: "es_US",
  hy: "hy_AM",
  ru: "ru_RU",
};

/**
 * Tag added to a lead submitted from a localized page so intake calls back
 * in the right language. `null` for English (no tag).
 */
export const LOCALE_LEAD_TAG: Record<Locale, string | null> = {
  en: null,
  es: "spanish",
  hy: "armenian",
  ru: "russian",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isRoutedLocale(value: string): value is RoutedLocale {
  return (ROUTED_LOCALES as readonly string[]).includes(value);
}

/** Path of a page in a locale: `/hy`, `/hy/contact`; English has no prefix. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  if (locale === DEFAULT_LOCALE) return clean || "/";
  return `/${locale}${clean}`;
}
