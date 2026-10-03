import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";
import { Reveal } from "./primitives/reveal";

type Props = {
  eyebrow?: string;
  heading?: string;
  body?: string;
  className?: string;
};

/**
 * Closing CTA band (redesign v2): ink with the consultation photo faded
 * behind a left-to-right gradient, gold hairline, gold pill + outline phone.
 */
export function CtaBand({
  eyebrow = "Free consultation",
  heading = "Ready to talk?",
  body = "Free consultation. Bilingual counsel. No fee unless we win your case.",
  className,
}: Props) {
  return (
    <section className={cn("surface-ink bg-background text-foreground relative isolate overflow-hidden", className)}>
      <Image
        src="/brand/consultation.webp"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="-z-10 object-cover opacity-35"
        style={{ objectPosition: "60% 30%" }}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#0f1115_20%,rgba(15,17,21,.55)_100%)]" />
      <div className="gold-hairline" />
      <div className="container-page flex flex-wrap items-center justify-between gap-8 py-[clamp(56px,8vw,96px)]">
        <Reveal className="max-w-[600px]">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="text-display-lg text-cream mt-3.5 font-semibold">{heading}</h2>
          <p className="text-cream/72 mt-3 text-base">{body}</p>
        </Reveal>
        <Reveal delay={80} className="flex flex-wrap gap-3">
          <Link href="/contact" className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}>
            <span>Request consultation</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
          </Link>
          <a href={`tel:${FIRM.phoneTel}`} className={buttonVariants({ variant: "outline-cream", size: "pill" })}>
            <Phone className="h-[15px] w-[15px]" aria-hidden />
            <span>{FIRM.phone}</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
