import { Phone, Mail, Clock, MapPin } from "lucide-react";

import { LeadForm } from "@/components/marketing/lead-form";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
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

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Contact
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            Free consultation. We&apos;ll call you back.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Tell us briefly what happened and we&apos;ll be in touch within
            one business hour during office hours. There is no fee unless we
            win your case.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div className="space-y-10">
            <ContactItem
              icon={<Phone className="h-5 w-5" aria-hidden />}
              label="Phone"
            >
              <a
                href={`tel:${FIRM.phoneTel}`}
                className="text-lg font-medium text-foreground hover:text-primary"
              >
                {FIRM.phone}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">
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
                className="text-lg font-medium text-foreground hover:text-primary"
              >
                {FIRM.email}
              </a>
              <p className="mt-1 text-sm text-muted-foreground">
                For sensitive case details, please request our secure document
                portal after we connect.
              </p>
            </ContactItem>

            <ContactItem
              icon={<MapPin className="h-5 w-5" aria-hidden />}
              label="Office"
            >
              <address className="text-lg font-medium not-italic text-foreground">
                {FIRM.address.street}
                <br />
                {FIRM.address.city}, {FIRM.address.state} {FIRM.address.zip}
              </address>
              <p className="mt-1 text-sm text-muted-foreground">
                Free visitor parking in the building. Wheelchair-accessible
                entry on Broadway.
              </p>
            </ContactItem>

            <ContactItem
              icon={<Clock className="h-5 w-5" aria-hidden />}
              label="Hours"
            >
              <p className="text-lg font-medium text-foreground">
                {FIRM.hours}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Evening and weekend appointments available by request.
              </p>
            </ContactItem>

            <div className="rounded-2xl border border-border bg-secondary/40 p-6">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  Languages:
                </span>{" "}
                Counsel available in {FIRM.languages.join(", ")}. Other
                language needs can usually be accommodated with a brief
                heads-up — please mention it on your intake.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border">
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
      <span className="mt-0.5 inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
