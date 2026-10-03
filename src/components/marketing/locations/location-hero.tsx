import Link from "next/link";
import { ArrowRight, Clock, Languages, MapPin, Phone } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FIRM } from "@/lib/constants";
import { pickLocationImage } from "@/lib/media";
import { cn } from "@/lib/utils";

import { PageHero, type Crumb } from "../page-hero";
import { HeroFactChips, type HeroFactChip } from "./hero-fact-chips";

/**
 * Shared ink photo hero for county / city / city × practice pages: the
 * generic California scene for the path, breadcrumb, eyebrow, split title
 * (gold italic second part), description, buttons and three glass fact chips.
 */
export function LocationHero({
  path,
  crumbs,
  eyebrow,
  titleA,
  titleB,
  description,
  facts,
}: {
  path: string;
  crumbs: Crumb[];
  eyebrow: string;
  titleA: string;
  titleB: string;
  description?: string;
  facts?: HeroFactChip[];
}) {
  const img = pickLocationImage(path);
  const chips: HeroFactChip[] = facts ?? [
    { icon: MapPin, k: "Office:", v: `${FIRM.address.street.split(",")[0]}, ${FIRM.address.city}` },
    { icon: Clock, k: "Deadline:", v: "2 years for most claims" },
    { icon: Languages, k: "Counsel in", v: FIRM.languages.join(" · ") },
  ];
  return (
    <PageHero
      eyebrow={eyebrow}
      breadcrumbs={crumbs}
      title={
        <>
          {titleA} <em className="em-gold">{titleB}</em>
        </>
      }
      description={description}
      image={{ src: img.name, alt: img.alt, priority: true }}
      actions={
        <>
          <Link href="#intake" className={cn(buttonVariants({ variant: "gold", size: "pill" }), "group/cta")}>
            <span>Free consultation</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" aria-hidden />
          </Link>
          <a href={`tel:${FIRM.phoneTel}`} className={buttonVariants({ variant: "outline-cream", size: "pill" })}>
            <Phone className="h-[15px] w-[15px]" aria-hidden />
            Call {FIRM.phone}
          </a>
        </>
      }
      aside={<HeroFactChips facts={chips} />}
    />
  );
}
