import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { FIRM } from "@/lib/constants";

/**
 * Floating mobile dock: persistent tap-to-call + free-consult on small
 * screens (the header collapses its CTA text below `sm`).
 */
export function MobileCtaBar() {
  return (
    <div
      role="region"
      aria-label="Quick contact"
      className="fixed inset-x-3 bottom-3 z-40 md:hidden print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="border-cream/12 bg-ink/92 grid min-h-14 grid-cols-[1fr_1.4fr] overflow-hidden rounded-2xl border shadow-[0_-12px_40px_-16px_rgba(0,0,0,.5)] backdrop-blur-md">
        <a
          href={`tel:${FIRM.phoneTel}`}
          className="text-cream active:bg-cream/8 flex items-center justify-center gap-2 px-3 text-sm font-semibold no-underline"
        >
          <span className="bg-gold text-ink inline-flex h-7 w-7 items-center justify-center rounded-full">
            <Phone className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span>Call</span>
        </a>
        <Link
          href="/contact"
          className="bg-gold text-ink active:bg-gold-light flex items-center justify-center gap-2 px-4 text-sm font-semibold no-underline"
        >
          <span>Free consultation</span>
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
