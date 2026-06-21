import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { es } from "./dictionaries/es";
import { hy } from "./dictionaries/hy";

export type { Locale } from "./config";
export type { Dictionary } from "./dictionaries/en";

/** Recursively-optional version of a type, for partial locale overrides. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const OVERRIDES: Record<Locale, DeepPartial<Dictionary>> = {
  en: {},
  es,
  hy,
};

/** Deep-merge a partial override onto a complete base, base wins on absence. */
function merge<T>(base: T, override: DeepPartial<T> | undefined): T {
  if (!override) return base;
  const out = { ...base } as T;
  for (const key of Object.keys(override) as Array<keyof T>) {
    const ov = override[key] as unknown;
    const bv = base[key] as unknown;
    if (
      ov &&
      bv &&
      typeof ov === "object" &&
      typeof bv === "object" &&
      !Array.isArray(ov)
    ) {
      out[key] = merge(bv, ov as DeepPartial<typeof bv>) as T[keyof T];
    } else if (ov !== undefined) {
      out[key] = ov as T[keyof T];
    }
  }
  return out;
}

/**
 * Resolve the full dictionary for a locale, falling back to English for any
 * key the locale hasn't translated yet. Always returns a complete Dictionary,
 * so call sites never have to null-check a string.
 */
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return merge(en, OVERRIDES[locale]);
}
