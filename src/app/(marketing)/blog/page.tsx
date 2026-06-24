import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { AttorneyHeroAside } from "@/components/marketing/attorney-hero-aside";
import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { getPublishedPosts } from "@/lib/data/blog";
import { pickLocationImage } from "@/lib/media";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  title: "Blog",
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

      <section className="container-page py-20 md:py-28">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group border-border bg-card hover:border-primary/30 relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(20,30,80,0.2)]"
              >
                <span
                  aria-hidden
                  className="via-primary absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-gold-500)] to-[var(--color-gold-500)] transition-transform duration-300 group-hover:scale-x-100"
                />
                {p.tags.length ? (
                  <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
                    {p.tags.slice(0, 2).join(" · ")}
                  </p>
                ) : null}
                <h2 className="font-display group-hover:text-primary mt-3 text-lg leading-snug font-medium tracking-tight transition-colors">
                  {p.title}
                </h2>
                {p.excerpt ? (
                  <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
                    {p.excerpt}
                  </p>
                ) : null}
                <div className="text-muted-foreground mt-auto flex items-center justify-between gap-3 pt-6 text-xs">
                  <span>
                    {p.author_name}
                    {p.published_at ? (
                      <>
                        {" · "}
                        <time dateTime={p.published_at}>
                          {new Date(p.published_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )}
                        </time>
                      </>
                    ) : null}
                  </span>
                  <ArrowUpRight
                    className="text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-colors"
                    aria-hidden
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <CtaBand />
    </>
  );
}
