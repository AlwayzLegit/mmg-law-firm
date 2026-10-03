import Image from "next/image";
import Link from "next/link";

import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getFirmSettings } from "@/lib/data/firm-settings";
import { TIER_1_LOCATIONS } from "@/lib/data/locations";
import { getPublicContentFlags } from "@/lib/data/public-content";

const NAV_PRACTICE = [
  { label: "Car Accidents", href: "/practice-areas/car-accidents" },
  { label: "Truck Accidents", href: "/practice-areas/truck-accidents" },
  { label: "Motorcycle Accidents", href: "/practice-areas/motorcycle-accidents" },
  { label: "Pedestrian Accidents", href: "/practice-areas/pedestrian-accidents" },
  { label: "Bicycle Accidents", href: "/practice-areas/bicycle-accidents" },
  { label: "Slip and Fall", href: "/practice-areas/slip-and-fall" },
  { label: "Wrongful Death", href: "/practice-areas/wrongful-death" },
  { label: "Dog Bites", href: "/practice-areas/dog-bites" },
  { label: "Rideshare Accidents", href: "/practice-areas/rideshare-accidents" },
  { label: "Catastrophic Injury", href: "/practice-areas/catastrophic-injury" },
  { label: "Employment Law", href: "/practice-areas/employment-law" },
];

const NAV_FIRM = [
  { label: "About Mihran", href: "/attorneys/mihran-ghazaryan" },
  { label: "Case Results", href: "/case-results" },
  { label: "Reviews", href: "/reviews" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const NAV_LEGAL = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Disclaimer", href: "/legal/disclaimer" },
  { label: "Accessibility", href: "/legal/accessibility" },
  { label: "Your CCPA Rights", href: "/legal/ccpa" },
];

/** Cities surfaced in the footer column. Short on purpose; sitemap.xml is
 *  the comprehensive list. */
const FOOTER_CITY_SLUGS = new Set<string>([
  "glendale",
  "los-angeles",
  "burbank",
  "pasadena",
  "long-beach",
  "santa-monica",
  "anaheim",
  "san-diego",
]);
const NAV_CITIES = TIER_1_LOCATIONS.filter((c) => FOOTER_CITY_SLUGS.has(c.citySlug)).map((c) => ({
  label: c.cityName,
  href: `/locations/${c.countySlug}/${c.citySlug}`,
}));

/**
 * Site footer (redesign v2): deep-ink surface, brand column + four link
 * columns, the four CRPC disclaimers verbatim, © line + bar number.
 */
export async function SiteFooter() {
  const [settings, flags] = await Promise.all([getFirmSettings(), getPublicContentFlags()]);
  const founded = settings.founded_year;
  const firmNav = NAV_FIRM.filter((item) =>
    item.href === "/case-results"
      ? flags.hasCaseResults
      : item.href === "/reviews"
        ? flags.hasTestimonials
        : item.href === "/blog"
          ? flags.hasBlogPosts
          : true,
  );
  return (
    <footer className="surface-ink bg-ink-deep text-cream/70 text-sm leading-[1.65]">
      <div className="container-page pt-[72px] pb-10">
        <div className="flex flex-wrap gap-10">
          <div className="min-w-0 flex-[2_1_260px]">
            <span className="inline-flex items-center gap-2.5">
              <Image src="/mmg-logo.png" alt="" width={30} height={30} className="block h-[30px] w-[30px]" />
              <span className="font-display text-cream text-[19px] leading-none font-semibold">
                MMG <span className="text-cream/60 font-normal">Law Firm</span>
              </span>
            </span>
            <p className="mt-[18px] max-w-[34ch]">
              California personal-injury counsel. Free consultation. No fee unless we win your case.
            </p>
            <div className="mt-5 grid gap-2">
              <address className="text-cream not-italic">{FIRM_FULL_ADDRESS}</address>
              <a href={`tel:${FIRM.phoneTel}`} className="text-cream hover:text-gold font-semibold no-underline">
                {FIRM.phone}
              </a>
              <a href={`mailto:${FIRM.email}`} className="text-cream/70 hover:text-gold no-underline">
                {FIRM.email}
              </a>
              <p className="text-cream/50 m-0 text-xs">{FIRM.hours}</p>
            </div>
          </div>

          <FooterColumn title="Practice Areas" items={NAV_PRACTICE} />
          <FooterColumn title="Cities We Serve" items={NAV_CITIES} />
          <FooterColumn title="Firm" items={firmNav} />
          <FooterColumn title="Legal" items={NAV_LEGAL} />
        </div>

        <div className="border-cream/12 text-cream/55 mt-14 grid max-w-[1000px] gap-2.5 border-t pt-7 text-[12.5px]">
          <p className="m-0">
            <span className="text-gold font-semibold tracking-[0.1em] uppercase">Attorney Advertising.</span>{" "}
            {DISCLAIMERS.advertising} The attorney responsible for this advertisement is {FIRM.attorneyName}, California
            State Bar No. {FIRM.barNumber}, {FIRM_FULL_ADDRESS}.
          </p>
          <p className="m-0">{DISCLAIMERS.general}</p>
          <p className="m-0">{DISCLAIMERS.results}</p>
          <p className="m-0">{DISCLAIMERS.testimonial}</p>
        </div>

        <div className="text-cream/50 mt-8 flex flex-wrap justify-between gap-x-4 gap-y-2 text-xs">
          <p className="m-0">
            &copy; {new Date().getFullYear()} {FIRM.legalName}.{founded ? ` Established ${founded}.` : ""} All rights
            reserved.
          </p>
          <p className="m-0">CA State Bar #{FIRM.barNumber}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title} className="flex-[1_1_150px]">
      <h3 className="text-gold m-0 font-sans text-[11px] leading-none font-semibold tracking-[0.18em] uppercase">{title}</h3>
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="text-cream/70 hover:text-cream no-underline transition-colors">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
