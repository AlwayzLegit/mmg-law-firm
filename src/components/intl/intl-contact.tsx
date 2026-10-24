import Link from "next/link";

import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getDictionary } from "@/lib/i18n";
import { localePath, type RoutedLocale } from "@/lib/i18n/config";

import { IntlLeadForm } from "./intl-lead-form";

/**
 * Localized contact page: the lead form, office details and what happens
 * after a request. TODO(human): attorney review required (see IntlLanding).
 */
export function IntlContact({ locale }: { locale: RoutedLocale }) {
  const t = getDictionary(locale);
  return (
    <div className="intl-page v3-page">
      <div className="intl-wrap">
        <nav aria-label="Breadcrumb" className="intl-breadcrumb">
          <Link href={localePath(locale, "/")}>{t.nav.home}</Link>
          <span>/</span>
          <span>{t.nav.contact}</span>
        </nav>
        <h1 className="intl-h1">{t.contact.title}</h1>
        <p className="intl-lead">{t.contact.lead}</p>
        <div className="intl-contact-grid">
          <div className="intl-form-box" style={{ marginTop: 0 }}>
            <IntlLeadForm locale={locale} id="intl-form" />
          </div>
          <aside className="intl-aside">
            <dl>
              <dt>{t.contact.officeTitle}</dt>
              <dd>{FIRM_FULL_ADDRESS}</dd>
              <dt style={{ marginTop: 18 }}>{t.contact.phoneLabel}</dt>
              <dd>
                <a href={`tel:${FIRM.phoneTel}`}>{FIRM.phone}</a>
              </dd>
              <dt style={{ marginTop: 18 }}>{t.contact.emailLabel}</dt>
              <dd>
                <a href={`mailto:${FIRM.email}`}>{FIRM.email}</a>
              </dd>
              <dt style={{ marginTop: 18 }}>{t.contact.hoursLabel}</dt>
              <dd>{t.contact.hours}</dd>
            </dl>
            <div>
              <h2 className="intl-h2" style={{ fontSize: 24 }}>{t.contact.whatToExpectTitle}</h2>
              <ul className="intl-steps">
                <li>{t.contact.whatToExpect.call}</li>
                <li>{t.contact.whatToExpect.free}</li>
                <li>{t.contact.whatToExpect.privacy}</li>
              </ul>
            </div>
          </aside>
        </div>
        <div className="intl-notice intl-page-bottom" style={{ marginTop: 0, marginBottom: 48 }}>
          <strong>{t.landing.noticeTitle}</strong> {t.landing.noticeBody}
        </div>
      </div>
    </div>
  );
}
