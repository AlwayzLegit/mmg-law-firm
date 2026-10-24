import Link from "next/link";

import { V3Img } from "@/components/v3/v3-img";
import { FIRM } from "@/lib/constants";
import { fmt, getDictionary } from "@/lib/i18n";
import { localePath, type RoutedLocale } from "@/lib/i18n/config";

import { IntlLeadForm } from "./intl-lead-form";

const Arrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
    <path d="M5 12h14" />
    <path d="M13 18l6-6" />
    <path d="M13 6l6 6" />
  </svg>
);

/** English pages each practice card links to. */
const PRACTICE_LINKS = {
  car: "/practice-areas/car-accidents",
  truck: "/practice-areas/truck-accidents",
  moto: "/practice-areas/motorcycle-accidents",
  other: "/practice-areas",
} as const;

/**
 * Localized landing page (`/hy`, `/ru`): hero with the attorney portrait,
 * fee line, the three specialties plus other injury cases (linking to the
 * English guides), how the firm works, attorney and service area, and the
 * lead form. Copy comes from the locale dictionary; the English notices
 * stay in the footer.
 *
 * TODO(human): attorney review required — dictionary copy is a translation
 * of AI-drafted text and must be reviewed before NEXT_PUBLIC_LOCALE_PAGES_LIVE.
 */
export function IntlLanding({ locale }: { locale: RoutedLocale }) {
  const t = getDictionary(locale);
  const contact = localePath(locale, "/contact");
  return (
    <div className="intl-page v3-page">
      <section className="intl-wrap intl-hero">
        <div>
          <p className="intl-eyebrow">{t.landing.eyebrow}</p>
          <h1 className="intl-h1">{t.landing.h1}</h1>
          <p className="intl-lead">{t.landing.lead}</p>
          <div className="intl-ctas">
            <Link href={contact} className="intl-btn intl-btn-primary">
              {t.cta.requestConsultation} <Arrow />
            </Link>
            <a href={`tel:${FIRM.phoneTel}`} className="intl-btn intl-btn-secondary">
              {fmt(t.cta.call, { phone: FIRM.phone })}
            </a>
          </div>
          <p className="intl-fee">
            <strong>{t.cta.noFeeUnlessWeWin}</strong> {t.landing.feeNote}
          </p>
        </div>
        <V3Img
          src="uploads/portraits/attorney-standing-transparent-portrait.png"
          alt={FIRM.attorneyName}
          className="intl-hero-art"
          priority
          sizes="(max-width: 900px) 380px, 460px"
          style={{ height: "auto" }}
        />
      </section>

      <section className="intl-wrap intl-section" aria-labelledby="intl-practices">
        <h2 id="intl-practices" className="intl-h2">{t.landing.practicesTitle}</h2>
        <div className="intl-cards">
          {(Object.keys(PRACTICE_LINKS) as Array<keyof typeof PRACTICE_LINKS>).map((k) => (
            <Link key={k} href={PRACTICE_LINKS[k]} hrefLang="en" className="intl-card">
              <h3>{t.landing.practices[k].title}</h3>
              <p>{t.landing.practices[k].body}</p>
              <span className="intl-card-more">
                {t.nav.englishSite} · {t.common.inEnglish}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="intl-section intl-section-dark" aria-labelledby="intl-why">
        <div className="intl-wrap">
          <h2 id="intl-why" className="intl-h2">{t.landing.whyTitle}</h2>
          <div className="intl-cards">
            {(["direct", "language", "insurer"] as const).map((k) => (
              <div key={k} className="intl-card">
                <h3>{t.landing.why[k].title}</h3>
                <p>{t.landing.why[k].body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="intl-wrap intl-section" aria-labelledby="intl-attorney">
        <div className="intl-two">
          <div className="intl-prose">
            <h2 id="intl-attorney" className="intl-h2">{t.landing.attorneyTitle}</h2>
            <p>{fmt(t.landing.attorneyBody, { bar: FIRM.barNumber })}</p>
            <p>
              <Link href="/attorneys/mihran-ghazaryan" hrefLang="en">
                {t.landing.attorneyLink} ({t.common.inEnglish})
              </Link>
            </p>
          </div>
          <div className="intl-prose">
            <h2 className="intl-h2">{t.landing.areasTitle}</h2>
            <p>{t.landing.areasBody}</p>
            <p>
              <Link href="/locations/los-angeles-county/glendale" hrefLang="en">
                Glendale ({t.common.inEnglish})
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="intl-wrap intl-section intl-page-bottom" aria-labelledby="intl-contact">
        <h2 id="intl-contact" className="intl-h2">{t.landing.contactTitle}</h2>
        <p className="intl-lead">{t.landing.contactBody}</p>
        <div className="intl-form-box">
          <IntlLeadForm locale={locale} id="intl-form" />
        </div>
        <div className="intl-notice">
          <strong>{t.landing.noticeTitle}</strong> {t.landing.noticeBody}
        </div>
      </section>
    </div>
  );
}
