import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { type BlogPostSummary, getPublishedPosts } from "@/lib/data/blog";
import { pickLocationImage } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "California Personal Injury Blog",
  description:
    "Articles on California personal-injury law, claim process, and what to do after an accident — written by Mihran M. Ghazaryan.",
  path: "/blog",
});

export const revalidate = 3600;

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();
  // No published posts → no page. Nav link + sitemap entry are suppressed
  // in tandem, so this is only reachable by a direct URL.
  if (posts.length === 0) notFound();

  // Featured = newest post; the rest fill the grid below.
  const [featured, ...rest] = posts;

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
        ]}
      />

      <PageHero
        eyebrow="Insights"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
        title={
          <>
            Personal-injury law,{" "}
            <span className="text-primary">in plain English.</span>
          </>
        }
        description="Practical articles on what to do after an accident, how the claim process actually works, and California-specific legal context."
        aside={
          <AttorneyHeroAside
            image={pickLocationImage("blog").name}
            alt={pickLocationImage("blog").alt}
            priority
          />
        }
      />

      <section className="container-page py-16 md:py-20">
        {/* Featured post — full-width card with hero image. */}
        <FeaturedCard post={featured} />

        {/* Remaining posts — image-led grid. */}
        {rest.length > 0 ? (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <CtaBand />
    </>
  );
}

function FeaturedCard({ post: p }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="group border-border bg-card hover:border-primary/30 grid overflow-hidden rounded-3xl border transition-all duration-200 hover:shadow-[0_24px_60px_-28px_rgba(20,30,80,0.25)] md:grid-cols-2"
    >
      <div className="bg-secondary relative aspect-[16/10] md:aspect-auto md:min-h-[22rem]">
        {p.hero_image_url ? (
          <Image
            src={p.hero_image_url}
            alt={p.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            priority
          />
        ) : (
          <FallbackArt />
        )}
      </div>
      <div className="flex flex-col p-8 md:p-10">
        <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
          Featured · {p.tags[0] ?? "Article"}
        </p>
        <h2 className="font-display group-hover:text-primary mt-3 text-2xl leading-tight font-medium tracking-tight transition-colors md:text-3xl">
          {p.title}
        </h2>
        {p.excerpt ? (
          <p className="text-muted-foreground mt-4 line-clamp-3 leading-relaxed">
            {p.excerpt}
          </p>
        ) : null}
        <div className="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-8 text-xs">
          <span>
            {p.author_name}
            {p.published_at ? (
              <>
                {" · "}
                <time dateTime={p.published_at}>
                  {formatDate(p.published_at)}
                </time>
              </>
            ) : null}
          </span>
          <span className="text-primary inline-flex items-center gap-1 text-sm font-medium">
            Read article
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post: p }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="group border-border bg-card hover:border-primary/30 relative flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(20,30,80,0.2)]"
    >
      <div className="bg-secondary relative aspect-[16/9] overflow-hidden">
        {p.hero_image_url ? (
          <Image
            src={p.hero_image_url}
            alt={p.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <FallbackArt />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {p.tags.length ? (
          <p className="text-primary text-[11px] font-semibold tracking-[0.16em] uppercase">
            {p.tags.slice(0, 2).join(" · ")}
          </p>
        ) : null}
        <h3 className="font-display group-hover:text-primary mt-2.5 text-lg leading-snug font-medium tracking-tight transition-colors">
          {p.title}
        </h3>
        {p.excerpt ? (
          <p className="text-muted-foreground mt-2.5 line-clamp-3 text-sm leading-relaxed">
            {p.excerpt}
          </p>
        ) : null}
        <div className="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-5 text-xs">
          <span>
            {p.published_at ? (
              <time dateTime={p.published_at}>
                {formatDate(p.published_at)}
              </time>
            ) : (
              p.author_name
            )}
          </span>
          <ArrowUpRight
            className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-colors"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}

/** Visual placeholder when a post has no hero_image_url set — keeps card
 *  geometry consistent and adds a subtle brand mark. */
function FallbackArt() {
  return (
    <div
      aria-hidden
      className="from-primary/20 via-primary/10 to-secondary absolute inset-0 bg-gradient-to-br"
    >
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-display text-primary/30 text-5xl font-medium tracking-tight">
          MMG
        </span>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
