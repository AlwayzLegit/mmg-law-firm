import Link from "next/link";

import { CtaBand } from "@/components/marketing/cta-band";
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

      <section className="border-b border-border bg-gradient-to-b from-secondary/40 to-background">
        <div className="container-page py-14 md:py-20">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Insights
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight md:text-5xl">
            Personal-injury law, in plain English.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Practical articles on what to do after an accident, how the claim
            process actually works, and California-specific legal context.
          </p>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-10 text-center">
            <p className="text-muted-foreground">
              Articles will appear here once published. In the meantime, the
              practice-area pages cover the most common questions.
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li
                key={p.slug}
                className="rounded-xl border border-border bg-card p-6"
              >
                {p.tags.length ? (
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                    {p.tags.slice(0, 2).join(" · ")}
                  </p>
                ) : null}
                <h2 className="mt-3 font-display text-lg font-medium tracking-tight">
                  <Link
                    href={`/blog/${p.slug}`}
                    className="transition-colors hover:text-primary"
                  >
                    {p.title}
                  </Link>
                </h2>
                {p.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {p.excerpt}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-muted-foreground">
                  {p.author_name}
                  {p.published_at ? (
                    <>
                      {" · "}
                      <time dateTime={p.published_at}>
                        {new Date(p.published_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CtaBand />
    </>
  );
}
