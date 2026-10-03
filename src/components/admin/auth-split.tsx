import Image from "next/image";

import { FIRM } from "@/lib/constants";

/**
 * Split-screen frame for login / onboarding: ink brand panel on the left,
 * paper form panel (max 420px) on the right.
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] font-sans text-sm">
      <section className="surface-ink bg-background text-foreground relative isolate flex min-h-[420px] flex-col justify-between overflow-hidden px-[clamp(24px,5vw,64px)] py-10">
        <Image src="/brand/working-the-file.webp" alt="" aria-hidden fill sizes="50vw" className="-z-10 object-cover opacity-[0.28]" priority />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,#0f1115_10%,rgba(15,17,21,.5)_60%,rgba(15,17,21,.7)_100%)]" />
        <div className="flex items-center gap-2.5">
          <Image src="/mmg-logo.png" alt="" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="font-display text-cream text-[19px] leading-none font-semibold">
            MMG <span className="text-cream/60 font-medium">Law Firm</span>
          </span>
          <span className="bg-gold/18 text-gold rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.12em] uppercase">Admin</span>
        </div>
        <div>
          <p className="text-gold m-0 text-xs font-semibold tracking-[0.16em] uppercase">Firm workspace</p>
          <h1 className="text-cream mt-3 max-w-[16ch] text-[clamp(32px,4vw,52px)] leading-[1.05] font-semibold tracking-[-0.025em]">
            Every lead, every page, one desk.
          </h1>
          <p className="text-cream/70 mt-3.5 max-w-[44ch] text-[15px]">
            Leads, follow-ups, content and case results for mmg-lawfirm.com. New devices are verified by email. Every write is logged.
          </p>
        </div>
        <p className="text-cream/45 m-0 text-xs">
          © {new Date().getFullYear()} {FIRM.legalName} · CA State Bar #{FIRM.barNumber} · Attorney advertising
        </p>
      </section>
      <section className="bg-paper flex items-center justify-center px-[clamp(20px,4vw,48px)] py-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </section>
    </main>
  );
}

export const authInput =
  "bg-card border-ink/16 focus:border-gold focus:ring-gold/25 h-[46px] w-full rounded-[10px] border px-3.5 text-[15px] outline-none focus:ring-[3px]";
export const authLabel = "text-stone grid gap-1.5 text-xs font-semibold tracking-[0.08em] uppercase";
export const authPrimary =
  "bg-ink text-cream hover:bg-ink-hover h-12 w-full rounded-[10px] text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
export const authSecondary =
  "bg-card border-ink/16 hover:border-ink text-foreground h-[46px] w-full rounded-[10px] border text-[13.5px] font-semibold transition-colors disabled:opacity-50";
