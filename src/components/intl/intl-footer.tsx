import Link from "next/link";

import { V3Img } from "@/components/v3/v3-img";
import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getFirmSettings } from "@/lib/data/firm-settings";
import { getDictionary } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  ROUTED_LOCALES,
  localePath,
  type Locale,
  type RoutedLocale,
} from "@/lib/i18n/config";

/**
 * Footer for the localized pages. Firm name, Glendale address, hours and
 * the "Attorney Advertising" label are localized; the four CRPC disclaimers
 * stay verbatim in English (the official text) behind a one-line note in
 * the page language saying so.
 */
export async function IntlFooter({ locale }: { locale: RoutedLocale }) {
  const t = getDictionary(locale);
  const settings = await getFirmSettings();
  const founded = settings.founded_year;
  const langs: Locale[] = [DEFAULT_LOCALE, ...ROUTED_LOCALES];
  return (
    <footer className="v3f">
      <div className="v3f-inner">
        <div className="v3f-top">
          <V3Img src="uploads/logos/mmg-law-firm-gold-wordmark.svg" alt={FIRM.legalName} className="v3f-logo" style={{ width: "min(320px,100%)", height: "auto" }} />
          <a href={`tel:${FIRM.phoneTel}`} className="v3f-phone">
            {FIRM.phone}
          </a>
          <address className="v3f-addr">
            {FIRM_FULL_ADDRESS}
            <br />
            {t.footer.hoursLabel}: {t.contact.hours}
          </address>
          <a href={`mailto:${FIRM.email}`} className="v3f-email">
            {FIRM.email}
          </a>
          <div className="v3f-langs">
            {t.footer.languagesLabel}
            <div className="v3f-langs-links">
              {langs.map((l) => (
                <Link key={l} href={localePath(l, "/")} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
                  {LOCALE_NAMES[l].native}
                </Link>
              ))}
            </div>
          </div>
          <Link href={localePath(locale, "/contact")} className="v3f-cta">
            {t.footer.cta}
          </Link>
        </div>

        <div className="v3f-intl-cols">
          <nav aria-label={t.footer.linksTitle} className="v3f-col">
            <p className="v3f-col-title">{t.footer.linksTitle}</p>
            <ul>
              <li><Link href={localePath(locale, "/")}>{t.nav.home}</Link></li>
              <li><Link href={localePath(locale, "/contact")}>{t.nav.contact}</Link></li>
              <li><Link href="/" hrefLang="en" lang="en">{t.nav.englishSite}</Link></li>
              <li><Link href="/attorneys/mihran-ghazaryan" hrefLang="en">{t.landing.attorneyLink} ({t.common.inEnglish})</Link></li>
            </ul>
          </nav>
          <nav aria-label={t.footer.legalTitle} className="v3f-col">
            <p className="v3f-col-title">{t.footer.legalTitle}</p>
            <ul>
              <li><Link href="/legal/privacy" hrefLang="en">{t.footer.privacy} ({t.common.inEnglish})</Link></li>
              <li><Link href="/legal/disclaimer" hrefLang="en">{t.footer.disclosures} ({t.common.inEnglish})</Link></li>
              <li><Link href="/legal/accessibility" hrefLang="en">{t.footer.accessibility} ({t.common.inEnglish})</Link></li>
            </ul>
          </nav>
        </div>

        <div className="v3f-legal">
          <p>
            <strong>{t.footer.attorneyAdvertising}</strong> {t.footer.noticesIntro}
          </p>
          <div lang="en">
            <p>
              <strong>Attorney Advertising.</strong> {DISCLAIMERS.advertising} The attorney responsible for this
              advertisement is {FIRM.attorneyName}, California State Bar No. {FIRM.barNumber}, {FIRM_FULL_ADDRESS}.
            </p>
            <p>{DISCLAIMERS.general}</p>
            <p>{DISCLAIMERS.results}</p>
            <p>{DISCLAIMERS.testimonial}</p>
          </div>
        </div>

        <div className="v3f-bottom">
          <p>
            &copy; {new Date().getFullYear()} {FIRM.legalName}.{founded ? ` ${founded}.` : ""} {t.footer.rights}
          </p>
          <p>California State Bar #{FIRM.barNumber}</p>
        </div>
      </div>
    </footer>
  );
}
