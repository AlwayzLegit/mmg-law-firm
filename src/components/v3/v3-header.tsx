import Link from "next/link";

import { FIRM } from "@/lib/constants";
import { LOCALE_NAMES, ROUTED_LOCALES, localePath } from "@/lib/i18n/config";
import { localePagesLive } from "@/lib/i18n/routes";
import { getPublicContentFlags } from "@/lib/data/public-content";
import {
  ABOUT_LINKS,
  CITY_LINKS,
  OTHER_CASES_LINK,
  RESOURCE_LINKS,
  SPECIALTIES,
  type NavLink,
  type Specialty,
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

/** Every path a specialty menu covers, for the active-state underline. */
function specialtyMatch(s: Specialty): string {
  return [s.hub.href, ...s.guides.map((g) => g.href), s.results.href, ...s.cities.map((c) => c.href)].join(",");
}

/**
 * One specialty's mega menu: hub card and results on the left, the guide
 * groups in the middle, the city × specialty pages on the right, and the
 * consultation strip along the bottom. Server-rendered so every link is a
 * real, crawlable <a>.
 */
function SpecialtyMenu({ s }: { s: Specialty }) {
  const id = `v3h-${s.key}`;
  return (
    <div className="v3h-dd" data-dd={s.key}>
      <button type="button" className="v3h-item" aria-expanded="false" aria-controls={id} data-dd-btn={s.key} data-nav-match={specialtyMatch(s)}>
        {s.hub.label}
        <Chevron />
      </button>
      <div id={id} className="v3h-panel v3h-mega" data-dd-panel={s.key}>
        <div className="v3h-mega-grid">
          <div className="v3h-spec v3h-spec-lead">
            <Link href={s.hub.href} className="v3h-spec-hub">
              <V3Img src={s.icon} alt="" style={{ width: 48, height: 48, flex: "none" }} />
              <span>
                <span className="v3h-spec-title">{s.hubTitle}</span>
                <span className="v3h-spec-desc">{s.hub.description}</span>
              </span>
            </Link>
            <Link href={s.results.href} className="v3h-more">
              {s.results.label} <Arrow />
            </Link>
          </div>
          {s.columns.map((c) => (
            <div key={c.title} className="v3h-spec">
              <p className="v3h-col-title">{c.title}</p>
              <List links={c.links} />
            </div>
          ))}
          <div className="v3h-spec">
            <p className="v3h-col-title">{s.citiesTitle}</p>
            <List links={s.cities} />
            <Link href="/locations" className="v3h-more">
              All California locations <Arrow />
            </Link>
          </div>
        </div>
        <div className="v3h-panel-foot">
          <p>{s.cta}</p>
          <span aria-hidden="true" />
          <Link href="/contact">
            Request a free case evaluation <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SmallMenu({ name, label, links, match, children, wide }: { name: string; label: string; links: NavLink[]; match: string; children?: React.ReactNode; wide?: boolean }) {
  const id = `v3h-${name}`;
  return (
    <div className="v3h-dd" data-dd={name}>
      <button type="button" className="v3h-item" aria-expanded="false" aria-controls={id} data-dd-btn={name} data-nav-match={match}>
        {label}
        <Chevron />
      </button>
      <div id={id} className={`v3h-panel v3h-small${wide ? " v3h-cities" : ""}`} data-dd-panel={name}>
        <List links={links} />
        {children}
      </div>
    </div>
  );
}

/**
 * Site header from the v3 design: dark bar, gold wordmark, serif nav and the
 * phone line. Car, truck and motorcycle accidents are the first three items,
 * each with its own mega menu; About, Resources and Locations follow as small
 * panels. V3HeaderClient only toggles which panel is open.
 */
export async function V3Header() {
  const flags = await getPublicContentFlags();
  const resources = [...RESOURCE_LINKS, ...(flags.hasBlogPosts ? [{ label: "Blog", href: "/blog" }] : []), OTHER_CASES_LINK];
  const aboutMatch = ABOUT_LINKS.map((l) => l.href).join(",");
  const resourcesMatch = [...resources.map((l) => l.href), "/practice-areas"].join(",");

  return (
    <header className="v3h" data-v3-header>
      <div className="v3h-bar">
        {/* The always-visible logo must not prefetch the entire homepage on
            every route (including the homepage itself). Navigation is intact. */}
        <Link href="/" prefetch={false} aria-label={`${FIRM.legalName} homepage`} className="v3h-logo">
          <V3Img
            src="uploads/logos/mmg-law-firm-gold-wordmark-with-vertical-separator-2.png"
            alt={FIRM.legalName}
            priority
            sizes="380px"
          />
        </Link>
        <nav aria-label="Primary" className="v3h-nav">
          {SPECIALTIES.map((s) => (
            <SpecialtyMenu key={s.key} s={s} />
          ))}
          <SmallMenu name="about" label="About" links={ABOUT_LINKS} match={aboutMatch} />
          <SmallMenu name="resources" label="Resources" links={resources} match={resourcesMatch} />
          <SmallMenu name="locations" label="Locations" links={CITY_LINKS} match="/locations" wide>
            <Link href="/locations" className="v3h-more">
              All California locations <Arrow />
            </Link>
          </SmallMenu>
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
              {SPECIALTIES.map((s) => (
                <details key={s.key}>
                  <summary>{s.hub.label}</summary>
                  <div className="v3h-m-group">
                    <Link href={s.hub.href} className="v3h-m-hub">
                      {s.hubTitle}
                    </Link>
                    {s.columns.map((c) => (
                      <List key={c.title} links={c.links} />
                    ))}
                    <List links={[s.results]} />
                  </div>
                  <div className="v3h-m-group">
                    <p className="v3h-m-sub">{s.citiesTitle}</p>
                    <List links={[...s.cities, { label: "All California locations", href: "/locations" }]} />
                  </div>
                </details>
              ))}
              <details>
                <summary>About</summary>
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
              {localePagesLive() ? (
                <details>
                  <summary>{ROUTED_LOCALES.map((l) => LOCALE_NAMES[l].native).join(" / ")}</summary>
                  <List links={ROUTED_LOCALES.map((l) => ({ label: LOCALE_NAMES[l].native, href: localePath(l, "/") }))} />
                </details>
              ) : null}
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
