import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { type BlogPostSummary, getPublishedPosts } from "@/lib/data/blog";
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
            Personal-injury law, <em className="em-gold">in plain English.</em>
          </>
        }
        description="Practical articles on what to do after an accident, how the claim process actually works, and California-specific legal context."
      />

      <section className="container-page section-pad-sm">
        <FeaturedCard post={featured} />
        {rest.length > 0 ? (
          <ul className="m-0 mt-7 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3.5 p-0">
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
      className="group bg-card border-line text-foreground grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] overflow-hidden rounded-[20px] border no-underline transition-shadow duration-200 hover:shadow-lift"
    >
      <span className="bg-ink-soft relative block min-h-[320px]">
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
      </span>
      <span className="flex flex-col p-[clamp(24px,3vw,40px)]">
        <span className="micro-label text-gold-deep tracking-[0.16em]">Featured · {p.tags[0] ?? "Article"}</span>
        <h2 className="font-display mt-3 text-[clamp(26px,3vw,38px)] leading-[1.1] font-semibold tracking-[-0.02em]">{p.title}</h2>
        {p.excerpt ? <span className="text-stone mt-3.5 text-[15.5px] leading-[1.6]">{p.excerpt}</span> : null}
        <span className="text-stone mt-auto flex flex-wrap justify-between gap-3 pt-6 text-[12.5px]">
          <span>
            {p.author_name}
            {p.published_at ? (
              <>
                {" · "}
                <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
              </>
            ) : null}
          </span>
          <span className="text-gold-deep inline-flex items-center gap-1.5 font-semibold">
            Read article
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </span>
        </span>
      </span>
    </Link>
  );
}

function PostCard({ post: p }: { post: BlogPostSummary }) {
  return (
    <Link
      href={`/blog/${p.slug}`}
      className="group bg-card border-line text-foreground hover:shadow-hover flex h-full flex-col overflow-hidden rounded-2xl border no-underline transition-[transform,box-shadow] duration-200 hover:-translate-y-1"
    >
      <span className="bg-ink-soft relative block aspect-video overflow-hidden">
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
      </span>
      <span className="flex flex-1 flex-col px-5 pt-[18px] pb-5">
        {p.tags.length ? (
          <span className="micro-label text-gold-deep tracking-[0.16em]">{p.tags.slice(0, 2).join(" · ")}</span>
        ) : null}
        <h3 className="font-display mt-2 text-[21px] leading-[1.2] font-semibold tracking-[-0.01em]">{p.title}</h3>
        {p.excerpt ? <span className="text-stone mt-2 line-clamp-3 text-sm leading-[1.55]">{p.excerpt}</span> : null}
        <span className="text-stone mt-auto flex items-center justify-between gap-3 pt-3.5 text-[12.5px]">
          <span>{p.published_at ? <time dateTime={p.published_at}>{formatDate(p.published_at)}</time> : p.author_name}</span>
          <ArrowUpRight className="text-stone group-hover:text-gold-deep h-3.5 w-3.5 transition-colors" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

/** Visual placeholder when a post has no hero_image_url set — keeps card
 *  geometry consistent and adds a subtle brand mark. */
function FallbackArt() {
  return (
    <span aria-hidden className="bg-ink-panel absolute inset-0 grid place-items-center">
      <span className="font-display text-cream/15 text-5xl font-semibold tracking-tight">MMG</span>
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
