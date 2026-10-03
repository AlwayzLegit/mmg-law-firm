import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { LOCATION_IMAGES, mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

const LOST_LINKS = [
  { href: "/practice-areas", label: "Practice areas" },
  { href: "/locations", label: "Locations we serve" },
  { href: "/attorneys/mihran-ghazaryan", label: "About the attorney" },
  { href: "/contact", label: "Contact the firm" },
] as const;

const COURTHOUSE = LOCATION_IMAGES.find((i) => i.name === "loc-courthouse.webp");

/**
 * Shared 404 body (redesign v2): full-bleed ink section with a faded
 * courthouse photo, outlined "404", gold eyebrow, and quick links. Used by the
 * root and the /(marketing) not-found routes so the copy stays identical.
 */
export function NotFoundView() {
  return (
    <section className="surface-ink bg-background text-foreground under-header relative isolate flex min-h-[70vh] items-center overflow-hidden">
      {COURTHOUSE ? (
        <Image
          src={mediaUrl(COURTHOUSE.name)}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="-z-10 object-cover opacity-[0.22]"
        />
      ) : null}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_100%,rgba(201,163,90,.18),transparent_60%)]"
      />
      <div className="container-page w-full py-[clamp(24px,4vw,56px)] text-center">
        <p
          aria-hidden
          className="font-display text-[clamp(120px,22vw,260px)] leading-[0.9] font-semibold tracking-[-0.05em] text-transparent [-webkit-text-stroke:1px_rgba(201,163,90,.5)]"
        >
          404
        </p>
        <p className="text-gold -mt-2 inline-flex items-center gap-3 text-xs font-semibold tracking-[0.16em] uppercase">
          <span aria-hidden className="bg-gold block h-px w-6" />
          Page not found
          <span aria-hidden className="bg-gold block h-px w-6" />
        </p>
        <h1 className="text-cream mx-auto mt-[18px] max-w-[20ch] text-[clamp(34px,4.6vw,56px)] leading-[1.05] font-semibold tracking-[-0.02em]">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-cream/72 mx-auto mt-4 max-w-[52ch] text-[16.5px]">
          The link may be outdated, or the page has moved. If you&apos;re trying
          to reach our office, the fastest way is by phone.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}>
            <ArrowLeft
              className="h-4 w-4 transition-transform group-hover/cta:-translate-x-0.5"
              aria-hidden
            />
            <span>Return home</span>
          </Link>
          <a
            href={`tel:${FIRM.phoneTel}`}
            className={buttonVariants({ variant: "outline-cream", size: "pill" })}
          >
            <Phone className="h-[15px] w-[15px]" aria-hidden />
            <span>Call {FIRM.phone}</span>
          </a>
        </div>
        <nav aria-label="Popular pages" className="mx-auto mt-12 max-w-[720px]">
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5 p-0">
            {LOST_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="border-cream/10 bg-cream/6 text-cream hover:bg-gold/14 block rounded-xl border p-3.5 text-[13.5px] font-semibold no-underline transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
