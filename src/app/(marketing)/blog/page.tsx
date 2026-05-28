import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CtaBand } from "@/components/marketing/cta-band";
import { PageHero } from "@/components/marketing/page-hero";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { getPublishedPosts } from "@/lib/data/blog";
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
      />

      <section className="container-page py-20 md:py-24">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center md:p-12">
            <p className="font-display text-xl font-medium tracking-tight md:text-2xl">
              Fresh writing on the way.
            </p>
            <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
              We&apos;re drafting articles on what to do after an accident,
              how California claims actually work, and the questions our
              clients ask most often. Until then, the{" "}
              <Link
                href="/practice-areas"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                practice-area pages
              </Link>{" "}
              cover the basics — and we&apos;re a phone call away.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-24px_rgba(20,30,80,0.2)]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-[var(--color-gold-500)] via-primary to-[var(--color-gold-500)] transition-transform duration-300 group-hover:scale-x-100"
                  />
                  {p.tags.length ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {p.tags.slice(0, 2).join(" · ")}
                    </p>
                  ) : null}
                  <h2 className="mt-3 font-display text-lg font-medium leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {p.title}
                  </h2>
                  {p.excerpt ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {p.excerpt}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-6 text-xs text-muted-foreground">
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
                      className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CtaBand />
    </>
  );
}
