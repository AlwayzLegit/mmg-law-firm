import { Phone, Mail, Clock, MapPin } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { LeadForm } from "@/components/marketing/lead-form";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Contact Us — Free Consultation",
  description: `Contact ${FIRM.legalName} for a free personal-injury consultation. Office in Glendale, California. Bilingual representation. No fee unless we win.`,
  path: "/contact",
});

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
        eyebrow="Contact"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        title={
          <>
            Free consultation.{" "}
            <span className="text-primary">We&apos;ll call you back.</span>
          </>
        }
        description="Tell us briefly what happened and we'll be in touch within one business hour during office hours. There is no fee unless we win your case."
        aside={
          <AttorneyHeroAside
            image={pickLocationImage("contact").name}
            alt={pickLocationImage("contact").alt}
            priority
          />
        }
      />

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="space-y-10">
            <ContactItem
              icon={<Phone className="h-5 w-5" aria-hidden />}
              label="Phone"
            >
              <a
                href={`tel:${FIRM.phoneTel}`}
                className="text-foreground hover:text-primary text-lg font-medium"
              >
                {FIRM.phone}
              </a>
              <p className="text-muted-foreground mt-1 text-sm">
                Available {FIRM.hours}. Calls outside office hours route to a
                same-day callback queue.
              </p>
            </ContactItem>

            <ContactItem
              icon={<Mail className="h-5 w-5" aria-hidden />}
              label="Email"
            >
              <a
                href={`mailto:${FIRM.email}`}
                className="text-foreground hover:text-primary text-lg font-medium"
              >
                {FIRM.email}
              </a>
              <p className="text-muted-foreground mt-1 text-sm">
                For sensitive case details, please request our secure document
                portal after we connect.
              </p>
            </ContactItem>

            <ContactItem
              icon={<MapPin className="h-5 w-5" aria-hidden />}
              label="Office"
            >
              <address className="text-foreground text-lg font-medium not-italic">
                {FIRM.address.street}
                <br />
                {FIRM.address.city}, {FIRM.address.state} {FIRM.address.zip}
              </address>
              <p className="text-muted-foreground mt-1 text-sm">
                Free visitor parking in the building. Wheelchair-accessible
                entry on Broadway.
              </p>
            </ContactItem>

            <ContactItem
              icon={<Clock className="h-5 w-5" aria-hidden />}
              label="Hours"
            >
              <p className="text-foreground text-lg font-medium">
                {FIRM.hours}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Evening and weekend appointments available by request.
              </p>
            </ContactItem>

            <div className="border-border bg-secondary/40 rounded-2xl border p-6">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">Languages:</span>{" "}
                Counsel available in {FIRM.languages.join(", ")}. Other language
                needs can usually be accommodated with a brief heads-up — please
                mention it on your intake.
              </p>
            </div>

            <div className="border-border overflow-hidden rounded-2xl border">
              <iframe
                title={`Map showing ${FIRM_FULL_ADDRESS}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(FIRM_FULL_ADDRESS)}&output=embed`}
                width="100%"
                height="320"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block w-full"
                style={{ border: 0 }}
              />
            </div>
          </div>

          <div>
            <LeadForm
              variant="full"
              autoFocus
              headline="Tell us what happened"
              description="We'll respond within one business hour during office hours. Free consultation."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function ContactItem({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="bg-primary/10 text-primary mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg">
        {icon}
      </span>
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          {label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
