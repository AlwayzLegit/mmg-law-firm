"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";

/**
 * Language switcher — FOUNDATION, not yet mounted.
 *
 * It's built routing-ready: it derives the current locale from the first path
 * segment and swaps it to build per-locale hrefs (default locale = no prefix).
 * Wire it into the header/footer only once `/[locale]` routing and
 * attorney-reviewed translations exist; until then it's intentionally unused.
 */
function localizePath(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && isLocale(segments[0])) segments.shift();
  const rest = segments.join("/");
  if (target === DEFAULT_LOCALE) return `/${rest}`;
  return `/${target}${rest ? `/${rest}` : ""}`;
}

export function LanguageSwitcher() {
  const pathname = usePathname() ?? "/";
  const first = pathname.split("/").filter(Boolean)[0];
  const current: Locale = first && isLocale(first) ? first : DEFAULT_LOCALE;

  return (
    <div className="flex items-center gap-1 text-sm">
      <Globe className="text-muted-foreground h-4 w-4" aria-hidden />
      <ul className="flex items-center gap-1">
        {LOCALES.map((loc) => (
          <li key={loc}>
            <Link
              href={localizePath(pathname, loc)}
              hrefLang={loc}
              aria-current={loc === current ? "true" : undefined}
              className={
                loc === current
                  ? "text-primary rounded px-1.5 py-0.5 font-medium"
                  : "text-muted-foreground hover:text-primary rounded px-1.5 py-0.5"
              }
            >
              {LOCALE_NAMES[loc].native}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
