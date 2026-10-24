import Link from "next/link";

import { V3Img } from "@/components/v3/v3-img";
import { FIRM } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { localePath, type RoutedLocale } from "@/lib/i18n/config";

const PhoneIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d="M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z" />
  </svg>
);

/**
 * Header for the localized pages: wordmark, a three-link nav (home,
 * contact, English site) and the phone line. No mega menu — the localized
 * section is two pages deep by design; everything else is English.
 */
export function IntlHeader({
  locale,
  current = "home",
}: {
  locale: RoutedLocale;
  current?: "home" | "contact";
}) {
  const t = getDictionary(locale);
  const home = localePath(locale, "/");
  const contact = localePath(locale, "/contact");
  return (
    <header className="v3h" data-v3-header>
      <div className="v3h-bar">
        <Link href={home} prefetch={false} aria-label={FIRM.legalName} className="v3h-logo">
          <V3Img
            src="uploads/logos/mmg-law-firm-gold-wordmark-with-vertical-separator-2.png"
            alt={FIRM.legalName}
            priority
            sizes="380px"
          />
        </Link>
        <nav aria-label={t.nav.menu} className="intl-nav">
          <Link href={home} className="intl-nav-home" aria-current={current === "home" ? "page" : undefined}>
            {t.nav.home}
          </Link>
          <Link href={contact} className="intl-nav-contact" aria-current={current === "contact" ? "page" : undefined}>
            {t.nav.contact}
          </Link>
          <Link href="/" hrefLang="en" lang="en" className="intl-nav-en">
            {t.nav.englishSite}
          </Link>
        </nav>
        <a href={`tel:${FIRM.phoneTel}`} className="v3h-phone" aria-label={`${t.cta.callNow} ${FIRM.phone}`}>
          <PhoneIcon />
          <span className="v3h-phone-num">{FIRM.phone}</span>
        </a>
      </div>
    </header>
  );
}
