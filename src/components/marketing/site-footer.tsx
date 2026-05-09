import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

import { DISCLAIMERS, FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";

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

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40 text-sm text-foreground">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl tracking-tight text-foreground">
              {FIRM.legalName}
            </p>
            <p className="mt-3 text-muted-foreground">
              California personal-injury counsel. Free consultation. No fee
              unless we win your case.
            </p>

            <ul className="mt-6 space-y-3">
              <li className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 flex-none text-primary"
                  aria-hidden
                />
                <address className="not-italic">{FIRM_FULL_ADDRESS}</address>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-none text-primary" aria-hidden />
                <a
                  href={`tel:${FIRM.phoneTel}`}
                  className="font-medium hover:text-primary"
                >
                  {FIRM.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-none text-primary" aria-hidden />
                <a
                  href={`mailto:${FIRM.email}`}
                  className="hover:text-primary"
                >
                  {FIRM.email}
                </a>
              </li>
            </ul>

            <p className="mt-4 text-xs text-muted-foreground">{FIRM.hours}</p>
          </div>

          <FooterColumn title="Practice Areas" items={NAV_PRACTICE} />
          <FooterColumn title="Firm" items={NAV_FIRM} />
          <FooterColumn title="Legal" items={NAV_LEGAL} />
        </div>

        <div className="mt-12 grid gap-4 border-t border-border pt-8 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-semibold uppercase tracking-wide text-foreground/80">
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

        <div className="mt-10 flex flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            &copy; {new Date().getFullYear()} {FIRM.legalName}. All rights
            reserved.
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
      <h3 className="font-display text-sm font-medium uppercase tracking-wide text-foreground">
        {title}
      </h3>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
