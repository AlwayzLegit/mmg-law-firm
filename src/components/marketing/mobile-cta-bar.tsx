import Link from "next/link";
import { Phone } from "lucide-react";

import { FIRM } from "@/lib/constants";

/**
 * Bottom-fixed action bar shown only on small screens (≤ md). Adds
 * persistent tap-to-call + free-consult CTAs without taking up viewport
 * real estate on tablet/desktop where the page header already serves
 * the same purpose. Hidden on print too.
 */
export function MobileCtaBar() {
  return (
    <div
      role="region"
      aria-label="Quick contact"
      className="md:hidden print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div className="grid grid-cols-2 gap-px bg-border">
        <a
          href={`tel:${FIRM.phoneTel}`}
          className="flex items-center justify-center gap-2 bg-background px-3 py-3 text-sm font-medium text-primary"
        >
          <Phone className="h-4 w-4" aria-hidden />
          Call
        </a>
        <Link
          href="/contact"
          className="flex items-center justify-center gap-2 bg-primary px-3 py-3 text-sm font-medium text-primary-foreground"
        >
          Free consultation
        </Link>
      </div>
    </div>
  );
}
