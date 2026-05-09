import Link from "next/link";

import { cn } from "@/lib/utils";

import { SectionEyebrow } from "./section-eyebrow";

export type Crumb = { label: string; href?: string };

type Props = {
  /** Eyebrow above the title. Defaults to "Attorney Advertising" since
   *  most landing pages need that label per CRPC §7.1 anyway. */
  eyebrow?: string;
  /** The H1. Pass a string or React node for inline emphasis. */
  title: React.ReactNode;
  /** Optional subhead paragraph. */
  description?: React.ReactNode;
  /** Optional breadcrumb trail rendered above the eyebrow. */
  breadcrumbs?: Crumb[];
  /** Optional action area rendered after the description. */
  actions?: React.ReactNode;
  /** Optional supplementary content rendered to the right on lg+ (e.g. a
   *  small card showing a key fact or contact panel). */
  aside?: React.ReactNode;
  className?: string;
};

/**
 * Inner-page hero, designed to match the homepage hero's visual language so
 * the site reads as one piece. Layered radial + faint grid backdrop, gold-
 * fade eyebrow rule, oversized display headline, optional breadcrumbs.
 */
export function PageHero({
  eyebrow = "Attorney Advertising",
  title,
  description,
  breadcrumbs,
  actions,
  aside,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border-b border-border",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 80% 0%, color-mix(in oklab, var(--color-primary) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-56 bg-[linear-gradient(to_right,rgba(43,70,216,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(43,70,216,0.06)_1px,transparent_1px)] bg-[size:32px_32px]"
        style={{
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)",
        }}
      />

      <div className="container-page py-14 md:py-20">
        <div
          className={cn(
            "grid gap-12",
            aside ? "lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16" : "",
          )}
        >
          <div>
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav
                aria-label="Breadcrumb"
                className="mb-5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground"
              >
                {breadcrumbs.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    {c.href ? (
                      <Link href={c.href} className="hover:text-primary">
                        {c.label}
                      </Link>
                    ) : (
                      <span className="text-foreground">{c.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 ? (
                      <span aria-hidden className="text-muted-foreground/50">
                        /
                      </span>
                    ) : null}
                  </span>
                ))}
              </nav>
            ) : null}

            <SectionEyebrow>{eyebrow}</SectionEyebrow>

            <h1 className="mt-5 max-w-[22ch] font-display text-[2.4rem] font-medium leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-[3.75rem]">
              {title}
            </h1>

            {description ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}

            {actions ? <div className="mt-8">{actions}</div> : null}
          </div>

          {aside}
        </div>
      </div>
    </section>
  );
}
