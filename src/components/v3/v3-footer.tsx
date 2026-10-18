import Link from "next/link";

import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getFirmSettings } from "@/lib/data/firm-settings";
import {
  ABOUT_LINKS,
  CITY_LINKS,
  LEGAL_LINKS,
  OTHER_CASES,
  RESOURCE_LINKS,
  SPECIALTIES,
  type NavLink,
} from "@/lib/v3/nav";

import { V3Img } from "./v3-img";

function Col({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <nav aria-label={title} className="v3f-col">
      <p className="v3f-col-title">{title}</p>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Site footer in the v3 design language (dark slate, gold wordmark) with the
 * full link structure for crawl depth and all four CRPC disclaimers verbatim.
 */
export async function V3Footer() {
  const settings = await getFirmSettings();
  const founded = settings.founded_year;
  const caseLinks: NavLink[] = SPECIALTIES.flatMap((s) => [s.hub, ...s.guides.slice(0, 3)]);
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
            {FIRM.hoursLong}
          </address>
          <a href={`mailto:${FIRM.email}`} className="v3f-email">
            {FIRM.email}
          </a>
          <p className="v3f-langs">{FIRM.languages.join(" / ")}</p>
          <Link href="/contact" className="v3f-cta">
            Free Case Consultation
          </Link>
        </div>

        <div className="v3f-cols">
          <Col title="Accident Cases" links={caseLinks} />
          <Col title="More Injury Cases" links={OTHER_CASES} />
          <Col title="About MMG" links={ABOUT_LINKS} />
          <Col title="Resources" links={RESOURCE_LINKS} />
          <Col title="Cities We Serve" links={[...CITY_LINKS.slice(0, 8), { label: "All locations", href: "/locations" }]} />
          <Col title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="v3f-legal">
          <p>
            <strong>Attorney Advertising.</strong> {DISCLAIMERS.advertising} The attorney responsible for this
            advertisement is {FIRM.attorneyName}, California State Bar No. {FIRM.barNumber}, {FIRM_FULL_ADDRESS}.
          </p>
          <p>{DISCLAIMERS.general}</p>
          <p>{DISCLAIMERS.results}</p>
          <p>{DISCLAIMERS.testimonial}</p>
        </div>

        <div className="v3f-bottom">
          <p>
            &copy; {new Date().getFullYear()} {FIRM.legalName}.{founded ? ` Established ${founded}.` : ""} All rights
            reserved.
          </p>
          <p>California State Bar #{FIRM.barNumber}</p>
        </div>
      </div>
    </footer>
  );
}
