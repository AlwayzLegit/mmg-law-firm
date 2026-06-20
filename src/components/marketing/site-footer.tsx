import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { getFirmSettings } from "@/lib/data/firm-settings";
import { TIER_1_LOCATIONS } from "@/lib/data/locations";
import { getPublicContentFlags } from "@/lib/data/public-content";

import { BrandMark } from "./brand-mark";

const NAV_PRACTICE = [
  { label: "Car Accidents", href: "/practice-areas/car-accidents" },
  { label: "Truck Accidents", href: "/practice-areas/truck-accidents" },
  {
    label: "Motorcycle Accidents",
    href: "/practice-areas/motorcycle-accidents",
  },
  {
    label: "Pedestrian Accidents",
    href: "/practice-areas/pedestrian-accidents",
  },
  { label: "Bicycle Accidents", href: "/practice-areas/bicycle-accidents" },
  { label: "Slip and Fall", href: "/practice-areas/slip-and-fall" },
  { label: "Wrongful Death", href: "/practice-areas/wrongful-death" },
  { label: "Dog Bites", href: "/practice-areas/dog-bites" },
  { label: "Rideshare Accidents", href: "/practice-areas/rideshare-accidents" },
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

/** Cities surfaced in the footer column. Pulls the LA / OC / inland top
 *  cities — SEO juice + lateral discovery. Keep this short; sitemap.xml
 *  is the comprehensive list. */
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
const NAV_CITIES = TIER_1_LOCATIONS.filter((c) =>
  FOOTER_CITY_SLUGS.has(c.citySlug),
).map((c) => ({
  label: c.cityName,
  href: `/locations/${c.countySlug}/${c.citySlug}`,
}));

export async function SiteFooter() {
  const [settings, flags] = await Promise.all([
    getFirmSettings(),
    getPublicContentFlags(),
  ]);
  const founded = settings.founded_year;
  // Hide links to content surfaces with nothing published yet.
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
    <footer className="border-border text-primary-foreground/85 relative isolate overflow-hidden border-t bg-[var(--color-brand-900)] text-sm">
      {/* gold accent rail */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold-500)] to-transparent"
      />
      {/* faint grid */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <BrandMark inverted />

            <p className="text-primary-foreground/70 mt-5">
              California personal-injury counsel. Free consultation. No fee
              unless we win your case.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 flex-none text-[var(--color-gold-500)]"
                  aria-hidden
                />
                <address className="text-primary-foreground/90 not-italic">
                  {FIRM_FULL_ADDRESS}
                </address>
              </li>
              <li className="flex items-center gap-3">
                <Phone
                  className="h-4 w-4 flex-none text-[var(--color-gold-500)]"
                  aria-hidden
                />
                <a
                  href={`tel:${FIRM.phoneTel}`}
                  className="text-primary-foreground font-medium hover:text-[var(--color-gold-300)]"
                >
                  {FIRM.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail
                  className="h-4 w-4 flex-none text-[var(--color-gold-500)]"
                  aria-hidden
                />
                <a
                  href={`mailto:${FIRM.email}`}
                  className="text-primary-foreground/85 hover:text-[var(--color-gold-300)]"
                >
                  {FIRM.email}
                </a>
              </li>
            </ul>

            <p className="text-primary-foreground/55 mt-4 text-xs">
              {FIRM.hours}
            </p>
          </div>

          <FooterColumn title="Practice Areas" items={NAV_PRACTICE} />
          <FooterColumn title="Cities We Serve" items={NAV_CITIES} />
          <FooterColumn title="Firm" items={firmNav} />
          <FooterColumn title="Legal" items={NAV_LEGAL} />
        </div>

        <div className="border-primary-foreground/15 text-primary-foreground/65 mt-12 grid gap-3 border-t pt-8 text-xs leading-relaxed">
          <p>
            <span className="font-semibold tracking-wide text-[var(--color-gold-300)] uppercase">
              Attorney Advertising.
            </span>{" "}
            {DISCLAIMERS.advertising} The attorney responsible for this
            advertisement is {FIRM.attorneyName}, California State Bar No.{" "}
            {FIRM.barNumber}, {FIRM_FULL_ADDRESS}.
          </p>
          <p>{DISCLAIMERS.general}</p>
          <p>{DISCLAIMERS.results}</p>
          <p>{DISCLAIMERS.testimonial}</p>
        </div>

        <div className="text-primary-foreground/55 mt-10 flex flex-col items-start justify-between gap-2 text-xs sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {FIRM.legalName}.
            {founded ? ` Established ${founded}.` : ""} All rights reserved.
          </p>
          <p>CA State Bar #{FIRM.barNumber}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-xs font-semibold tracking-[0.18em] text-[var(--color-gold-300)] uppercase">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-primary-foreground/75 transition-colors hover:text-[var(--color-gold-300)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
