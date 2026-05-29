import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { FIRM } from "@/lib/constants";

/**
 * Floating mobile dock: persistent tap-to-call + free-consult on small
 * screens, lifted off the bottom edge so it feels like an object rather
 * than chrome. Right side weighted toward the primary action.
 */
export function MobileCtaBar() {
  return (
    <div
      role="region"
      aria-label="Quick contact"
      className="md:hidden print:hidden fixed inset-x-3 bottom-3 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid min-h-[56px] grid-cols-[1fr_1.4fr] overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-[0_-12px_40px_-16px_rgba(20,30,80,0.25),0_2px_0_rgba(255,255,255,0.6)_inset] backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <a
          href={`tel:${FIRM.phoneTel}`}
          className="flex items-center justify-center gap-2 px-3 text-sm font-semibold text-primary transition-colors active:bg-primary/5"
        >
          <Phone className="h-4 w-4" aria-hidden />
          <span>Call</span>
        </a>
        <Link
          href="/contact"
          className="group relative flex items-center justify-center gap-2 overflow-hidden bg-gradient-to-r from-primary to-[var(--color-brand-700,#18298c)] px-4 text-sm font-semibold text-primary-foreground shadow-[0_-1px_0_rgba(255,255,255,0.15)_inset]"
        >
          <span>Free consultation</span>
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}
