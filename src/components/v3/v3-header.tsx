import Link from "next/link";

import { FIRM } from "@/lib/constants";
import { getPublicContentFlags } from "@/lib/data/public-content";
import {
  ABOUT_LINKS,
  CITY_LINKS,
  OTHER_CASES,
  RESOURCE_LINKS,
  SPECIALTIES,
  type NavLink,
} from "@/lib/v3/nav";

import { V3HeaderClient } from "./v3-header-client";
import { V3Img } from "./v3-img";

const PhoneIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
    <path d="M231.88,175.08A56.26,56.26,0,0,1,176,224C96.6,224,32,159.4,32,80A56.26,56.26,0,0,1,80.92,24.12a16,16,0,0,1,16.62,9.52l21.12,47.15,0,.12A16,16,0,0,1,117.39,96c-.18.27-.37.52-.57.77L96,121.45c7.49,15.22,23.41,31,38.83,38.51l24.34-20.71a8.12,8.12,0,0,1,.75-.56,16,16,0,0,1,15.17-1.4l.13.06,47.11,21.11A16,16,0,0,1,231.88,175.08Z" />
  </svg>
);

const Chevron = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="v3h-chev">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const Arrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
    <path d="M5 12h14" />
    <path d="M13 18l6-6" />
    <path d="M13 6l6 6" />
  </svg>
);

function List({ links }: { links: NavLink[] }) {
  return (
    <ul className="v3h-list">
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href}>{l.label}</Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Site header from the v3 design: dark bar, gold wordmark, serif nav and the
 * phone line. Dropdown panels are server-rendered (every link is a real,
 * crawlable <a>); V3HeaderClient only toggles which panel is open.
 */
export async function V3Header() {
  const flags = await getPublicContentFlags();
  const casesMatch = [
    "/practice-areas",
    ...SPECIALTIES.flatMap((sp) => sp.guides.map((g) => g.href)),
    ...OTHER_CASES.map((o) => o.href),
  ].join(",");
  const resources = flags.hasBlogPosts
    ? [...RESOURCE_LINKS, { label: "Blog", href: "/blog" }]
    : RESOURCE_LINKS;

  return (
    <header className="v3h" data-v3-header>
      <div className="v3h-bar">
        <Link href="/" aria-label={`${FIRM.legalName} homepage`} className="v3h-logo">
          <V3Img
            src="uploads/logos/mmg-law-firm-gold-wordmark-with-vertical-separator-2.png"
            alt={FIRM.legalName}
            priority
            sizes="380px"
          />
        </Link>

        <nav aria-label="Primary" className="v3h-nav">
          <Link href="/attorneys/mihran-ghazaryan" className="v3h-item" data-nav-match="/attorneys">
            Our Attorney
          </Link>

          <div className="v3h-dd" data-dd="cases">
            <button type="button" className="v3h-item" aria-expanded="false" aria-controls="v3h-cases" data-dd-btn="cases" data-nav-match={casesMatch}>
              Accident Cases
              <Chevron />
            </button>
            <div id="v3h-cases" className="v3h-panel v3h-mega" data-dd-panel="cases">
              <p className="v3h-panel-title">Accident Cases</p>
              <div className="v3h-mega-grid">
                {SPECIALTIES.map((s) => (
                  <div key={s.key} className="v3h-spec">
                    <Link href={s.hub.href} className="v3h-spec-hub">
                      <V3Img src={s.icon} alt="" style={{ width: 48, height: 48, flex: "none" }} />
                      <span>
                        <span className="v3h-spec-title">{s.hub.label}</span>
                        <span className="v3h-spec-desc">{s.hub.description}</span>
                      </span>
                    </Link>
                    <List links={s.guides} />
                    <Link href={s.results.href} className="v3h-more">
                      {s.results.label} <Arrow />
                    </Link>
                  </div>
                ))}
                <div className="v3h-spec v3h-other">
                  <p className="v3h-col-title">Other injury cases</p>
                  <List links={OTHER_CASES} />
                </div>
              </div>
              <div className="v3h-panel-foot">
                <p>Not sure where to start?</p>
                <span aria-hidden="true" />
                <Link href="/contact">
                  Request a free case evaluation <Arrow />
                </Link>
              </div>
            </div>
          </div>

          <div className="v3h-dd" data-dd="about">
            <button type="button" className="v3h-item" aria-expanded="false" aria-controls="v3h-about" data-dd-btn="about" data-nav-match="/about-the-firm,/reviews,/case-results,/fees-and-costs,/car-accident-case-results,/truck-accident-case-results,/motorcycle-accident-case-results">
              About MMG
              <Chevron />
            </button>
            <div id="v3h-about" className="v3h-panel v3h-small" data-dd-panel="about">
              <List links={ABOUT_LINKS} />
            </div>
          </div>

          <div className="v3h-dd" data-dd="resources">
            <button type="button" className="v3h-item" aria-expanded="false" aria-controls="v3h-resources" data-dd-btn="resources" data-nav-match="/resources,/accident-lawyer-faqs,/what-to-do-after-california-accident,/california-accident-claim-deadlines,/how-an-accident-claim-works,/compensation-after-a-california-accident,/insurance-settlement-offers-releases,/partial-fault-california-accident,/medical-bills-liens-treatment-costs,/blog">
              Resources
              <Chevron />
            </button>
            <div id="v3h-resources" className="v3h-panel v3h-small" data-dd-panel="resources">
              <List links={resources} />
            </div>
          </div>

          <div className="v3h-dd" data-dd="locations">
            <button type="button" className="v3h-item" aria-expanded="false" aria-controls="v3h-locations" data-dd-btn="locations" data-nav-match="/locations">
              Locations
              <Chevron />
            </button>
            <div id="v3h-locations" className="v3h-panel v3h-small v3h-cities" data-dd-panel="locations">
              <List links={CITY_LINKS} />
              <Link href="/locations" className="v3h-more">
                All California locations <Arrow />
              </Link>
            </div>
          </div>

          <Link href="/contact" className="v3h-item" data-nav-match="/contact">
            Contact
          </Link>
        </nav>

        <a href={`tel:${FIRM.phoneTel}`} className="v3h-phone" aria-label={`Call ${FIRM.phone}`}>
          <PhoneIcon />
          <span className="v3h-phone-num">{FIRM.phone}</span>
        </a>

        <details className="v3h-mobile" data-mobile-nav>
          <summary aria-label="Open menu" className="v3h-burger">
            <span />
            <span />
            <span />
          </summary>
          <div className="v3h-sheet">
            <nav aria-label="Mobile">
              <Link href="/attorneys/mihran-ghazaryan" className="v3h-m-top">
                Our Attorney
              </Link>
              <details>
                <summary>Accident Cases</summary>
                {SPECIALTIES.map((s) => (
                  <div key={s.key} className="v3h-m-group">
                    <Link href={s.hub.href} className="v3h-m-hub">
                      {s.hub.label}
                    </Link>
                    <List links={s.guides} />
                  </div>
                ))}
                <div className="v3h-m-group">
                  <p className="v3h-m-sub">Other injury cases</p>
                  <List links={OTHER_CASES} />
                </div>
              </details>
              <details>
                <summary>About MMG</summary>
                <List links={ABOUT_LINKS} />
              </details>
              <details>
                <summary>Resources</summary>
                <List links={resources} />
              </details>
              <details>
                <summary>Locations</summary>
                <List links={[...CITY_LINKS, { label: "All California locations", href: "/locations" }]} />
              </details>
              <Link href="/contact" className="v3h-m-top">
                Contact
              </Link>
            </nav>
            <div className="v3h-m-cta">
              <a href={`tel:${FIRM.phoneTel}`} className="v3h-m-call">
                <PhoneIcon size={20} /> Call {FIRM.phone}
              </a>
              <Link href="/contact" className="v3h-m-consult">
                Free Case Consultation <Arrow />
              </Link>
            </div>
          </div>
        </details>
      </div>
      <V3HeaderClient />
    </header>
  );
}
