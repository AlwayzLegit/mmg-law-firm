/**
 * Internationalization configuration (foundation only).
 *
 * This declares the locales the firm intends to support. NOTHING is wired
 * into routing yet — the site serves English at the existing paths. The full
 * rollout (a `/[locale]` route segment, hreflang alternates, and a mounted
 * language switcher) is a deliberate next phase that also depends on
 * attorney-reviewed translations of the legal copy (CRPC §7.1 compliance in
 * another language is not a mechanical translation).
 *
 * Armenian (`hy`) is the priority second locale given Glendale's community;
 * Spanish (`es`) is next. Keep `en` first — it is the default/fallback.
 */
export const LOCALES = ["en", "es", "hy"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Display names: `label` in English, `native` in the language itself. */
export const LOCALE_NAMES: Record<Locale, { label: string; native: string }> = {
  en: { label: "English", native: "English" },
  es: { label: "Spanish", native: "Español" },
  hy: { label: "Armenian", native: "Հայերեն" },
};

/** BCP-47 tags for <html lang> / hreflang once routing lands. */
export const LOCALE_HREFLANG: Record<Locale, string> = {
  en: "en-US",
  es: "es",
  hy: "hy",
};

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
