import { Clock, Languages, Mail, MapPin, Phone } from "lucide-react";

import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { IconTile } from "@/components/marketing/primitives/icon-tile";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Contact Us — Free Consultation",
  description: `Contact ${FIRM.legalName} for a free personal-injury consultation. Office in Glendale, California. Bilingual representation. No fee unless we win.`,
  path: "/contact",
});

const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(FIRM_FULL_ADDRESS)}`;

export default function ContactPage() {
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ]}
      />

      <PageHero
        eyebrow="Contact · Free consultation"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        title={
          <>
            Free consultation. <em className="em-gold">We&apos;ll call you back.</em>
          </>
        }
        description="Tell us briefly what happened and we'll be in touch within one business hour during office hours. There is no fee unless we win your case."
        aside={
          <a
            href={`tel:${FIRM.phoneTel}`}
            className="bg-gold/12 border-gold/30 hover:bg-gold/22 text-cream flex items-center gap-4 rounded-2xl border px-[22px] py-5 no-underline transition-colors"
          >
            <span className="bg-gold text-ink inline-flex h-12 w-12 flex-none items-center justify-center rounded-full">
              <Phone className="h-5 w-5" aria-hidden />
            </span>
            <span>
              <span className="text-cream/55 block text-[11px] tracking-[0.16em] uppercase">Call now</span>
              <span className="font-display block text-[clamp(24px,2.4vw,30px)] leading-[1.1] font-semibold tracking-[-0.02em]">
                {FIRM.phone}
              </span>
              <span className="text-cream/60 mt-0.5 block text-xs">{FIRM.hours}</span>
            </span>
          </a>
        }
      />

      <section className="container-page grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-10 pt-[clamp(40px,6vw,64px)] pb-24">
        <div className="grid min-w-0 gap-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3">
            <a href={`tel:${FIRM.phoneTel}`} className="bg-card border-line hover:border-gold text-foreground block rounded-[14px] border p-5 no-underline transition-colors">
              <IconTile size="md" tone="gold">
                <Phone aria-hidden />
              </IconTile>
              <p className="micro-label text-stone m-0 mt-3.5">Phone</p>
              <p className="font-display m-0 mt-1 text-[22px] leading-[1.15] font-semibold">{FIRM.phone}</p>
              <p className="text-stone m-0 mt-1.5 text-[13px]">
                Available {FIRM.hours}. Calls outside office hours route to a same-day callback queue.
              </p>
            </a>
            <a href={`mailto:${FIRM.email}`} className="bg-card border-line hover:border-gold text-foreground block rounded-[14px] border p-5 no-underline transition-colors">
              <IconTile size="md" tone="gold">
                <Mail aria-hidden />
              </IconTile>
              <p className="micro-label text-stone m-0 mt-3.5">Email</p>
              <p className="font-display m-0 mt-1 text-[22px] leading-[1.15] font-semibold [overflow-wrap:anywhere]">{FIRM.email}</p>
              <p className="text-stone m-0 mt-1.5 text-[13px]">
                For sensitive case details, please request our secure document portal after we connect.
              </p>
            </a>
            <div className="bg-card border-line rounded-[14px] border p-5">
              <IconTile size="md" tone="gold">
                <MapPin aria-hidden />
              </IconTile>
              <p className="micro-label text-stone m-0 mt-3.5">Office</p>
              <address className="font-display m-0 mt-1 text-[22px] leading-[1.15] font-semibold not-italic">
                {FIRM.address.street}
                <br />
                {FIRM.address.city}, {FIRM.address.state} {FIRM.address.zip}
              </address>
              <p className="text-stone m-0 mt-1.5 text-[13px]">
                Free visitor parking in the building. Wheelchair-accessible entry on Broadway.
              </p>
            </div>
            <div className="bg-card border-line rounded-[14px] border p-5">
              <IconTile size="md" tone="gold">
                <Clock aria-hidden />
              </IconTile>
              <p className="micro-label text-stone m-0 mt-3.5">Hours</p>
              <p className="font-display m-0 mt-1 text-[22px] leading-[1.15] font-semibold">{FIRM.hours}</p>
              <p className="text-stone m-0 mt-1.5 text-[13px]">Evening and weekend appointments available by request.</p>
            </div>
          </div>

          <div className="surface-ink bg-background text-foreground flex flex-wrap items-center gap-3.5 rounded-[14px] px-5 py-[18px]">
            <Languages className="text-gold h-[18px] w-[18px] flex-none" aria-hidden />
            <p className="text-cream/80 m-0 text-sm">
              <strong className="text-cream font-semibold">Languages:</strong> Counsel available in{" "}
              {FIRM.languages.join(", ")}. Other language needs can usually be accommodated with a brief heads-up —
              please mention it on your intake.
            </p>
          </div>

          <div className="border-line surface-paper-2 bg-background relative overflow-hidden rounded-2xl border">
            <iframe
              title={`Map showing ${FIRM_FULL_ADDRESS}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(FIRM_FULL_ADDRESS)}&output=embed`}
              width="100%"
              height="340"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block w-full saturate-[.7]"
              style={{ border: 0 }}
            />
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="bg-ink text-cream absolute bottom-3.5 left-3.5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold no-underline"
            >
              <MapPin className="text-gold h-3.5 w-3.5" aria-hidden />
              Open directions
            </a>
          </div>
        </div>

        <div id="intake" className="scroll-mt-[92px]">
          <LeadForm
            variant="full"
            autoFocus
            headline="Tell us what happened"
            description="We'll respond within one business hour during office hours. Free consultation."
          />
        </div>
      </section>
    </>
  );
}
