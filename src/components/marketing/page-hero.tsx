import Image from "next/image";
import Link from "next/link";

import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

import { Eyebrow } from "./primitives/eyebrow";

export type Crumb = { label: string; href?: string };

export type HeroFact = { icon: React.ReactNode; label: React.ReactNode };

type Props = {
  /** Eyebrow above the title. Defaults to "Attorney Advertising" since
   *  most landing pages need that label per CRPC §7.1 anyway. */
  eyebrow?: string;
  /** The H1. Pass a string or React node for inline emphasis (`<em className="em-gold">`). */
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** Action area (buttons) rendered after the description. */
  actions?: React.ReactNode;
  /** Right-hand slot (e.g. a call card). Grid becomes two columns on lg. */
  aside?: React.ReactNode;
  /** Background photo (media-bucket object name OR absolute URL) shown on the
   *  right ~58% with the design's ink gradients. */
  image?: { src: string; alt?: string; position?: string; priority?: boolean };
  /** Fact strip rendered under the content (1px top border, auto-fit). */
  facts?: HeroFact[];
  /** Flow under the floating header (default). Pass false on pages where
   *  the header is docked. */
  underHeader?: boolean;
  className?: string;
  /** Extra content below the fact strip but inside the ink surface. */
  children?: React.ReactNode;
};

/**
 * Inner-page hero (redesign v2): ink surface, optional right-side photo with
 * gradient fades, breadcrumbs (uppercase, current crumb gold), eyebrow, H1,
 * description, actions, optional fact strip. Breadcrumb JSON-LD stays with the
 * page (BreadcrumbJsonLd); this renders only the visible trail.
 */
export function PageHero({
  eyebrow = "Attorney Advertising",
  title,
  description,
  breadcrumbs,
  actions,
  aside,
  image,
  facts,
  underHeader = true,
  className,
  children,
}: Props) {
  const src = image ? (image.src.startsWith("http") || image.src.startsWith("/") ? image.src : mediaUrl(image.src)) : null;
  return (
    <section
      className={cn(
        "surface-ink bg-background text-foreground relative isolate overflow-hidden",
        underHeader && "under-header",
        className,
      )}
    >
      {src ? (
        <div aria-hidden className="absolute inset-y-0 right-0 -z-10 w-[58%] max-lg:w-full">
          <Image
            src={src}
            alt={image?.alt ?? ""}
            fill
            priority={image?.priority}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover saturate-[.85]"
            style={{ objectPosition: image?.position ?? "50% 50%" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f1115_0%,rgba(15,17,21,.85)_22%,rgba(15,17,21,.15)_60%,rgba(15,17,21,.4)_100%)] max-lg:bg-[linear-gradient(to_bottom,rgba(15,17,21,.9),rgba(15,17,21,.75))]" />
          <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-ink to-transparent" />
        </div>
      ) : null}
      <div
        className={cn(
          "container-page relative",
          underHeader ? "pt-0" : "pt-[clamp(32px,5vw,56px)]",
          facts ? "pb-0" : "pb-[clamp(40px,6vw,64px)]",
        )}
      >
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb">
            <ol className="text-cream/55 m-0 flex list-none flex-wrap gap-2 p-0 text-xs tracking-[0.1em] uppercase">
              {breadcrumbs.map((c, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <li key={i} className="inline-flex items-center gap-2">
                    {c.href && !isLast ? (
                      <Link href={c.href} className="hover:text-cream no-underline transition-colors">
                        {c.label}
                      </Link>
                    ) : (
                      <span className={isLast ? "text-gold" : undefined} aria-current={isLast ? "page" : undefined}>
                        {c.label}
                      </span>
                    )}
                    {!isLast ? <span aria-hidden>/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        <div className={cn("mt-7 grid items-end gap-8", aside && "grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]")}>
          <div className="max-w-[660px]">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="text-display-hero text-cream mt-4 font-semibold">{title}</h1>
            {description ? <p className="text-cream/74 mt-5 max-w-[54ch] text-[16.5px] leading-[1.6]">{description}</p> : null}
            {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {aside}
        </div>

        {facts && facts.length > 0 ? (
          <ul className="border-cream/12 m-0 mt-12 grid list-none grid-cols-[repeat(auto-fit,minmax(200px,1fr))] border-t p-0">
            {facts.map((f, i) => (
              <li
                key={i}
                className={cn(
                  "text-cream/80 flex items-center gap-3 py-[18px] text-[13.5px]",
                  i === 0 ? "pr-5" : i === facts.length - 1 ? "pl-5" : "px-5",
                )}
              >
                <span className="text-gold [&_svg]:h-[18px] [&_svg]:w-[18px]">{f.icon}</span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {children}
      </div>
    </section>
  );
}
