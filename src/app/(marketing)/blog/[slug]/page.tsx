import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, Clock, Tag } from "lucide-react";

import { BlogShare } from "@/components/marketing/blog-share";
import { BlogToc } from "@/components/marketing/blog-toc";
import { CtaBand } from "@/components/marketing/cta-band";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { readingTime } from "@/lib/blog/reading-time";
import { relatedPosts } from "@/lib/blog/related";
import { extractToc } from "@/lib/blog/toc";
import { getPostBySlug, getPublishedPosts } from "@/lib/data/blog";
import { canonicalUrl, defaultOgImageUrl } from "@/lib/seo/canonical";
import { jsonLd } from "@/lib/seo/json-ld";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildArticle } from "@/lib/seo/schema";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return buildMetadata({
      title: "Post not found",
      description: "We couldn't find this post.",
      path: `/blog/${slug}`,
      noindex: true,
    });
  }
  return buildMetadata({
    title: post.title,
    description: post.meta_description ?? post.excerpt ?? post.title,
    path: `/blog/${post.slug}`,
    image: post.hero_image_url ?? null, // null → per-page opengraph-image.tsx
    ogType: "article",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const path = `/blog/${post.slug}`;
  const url = canonicalUrl(path);
  const toc = extractToc(post.body_md);
  const readMinutes = readingTime(post.body_md);
  const allPosts = await getPublishedPosts();
  const related = relatedPosts(post, allPosts, 3);

  const articleJson = buildArticle({
    title: post.title,
    description: post.meta_description ?? post.excerpt ?? post.title,
    path,
    image: post.hero_image_url ?? defaultOgImageUrl(),
    publishedAt: post.published_at ?? undefined,
    author: post.author_name,
  });

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleJson) }}
      />

      <article className="container-page py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="text-muted-foreground/50 mx-1.5">/</span>
          <Link href="/blog" className="hover:text-primary">
            Blog
          </Link>
          <span className="text-muted-foreground/50 mx-1.5">/</span>
          <span className="text-foreground/80">{post.title}</span>
        </nav>

        <header className="mx-auto mt-8 max-w-3xl">
          {post.tags.length ? (
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {post.tags.slice(0, 2).join(" · ")}
            </p>
          ) : null}
          <h1 className="font-display mt-3 text-4xl leading-tight font-medium tracking-tight md:text-5xl">
            {post.title}
          </h1>
          {post.subtitle ? (
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              {post.subtitle}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-foreground font-medium">
              {post.author_name}
            </span>
            {post.published_at ? (
              <>
                <span className="text-muted-foreground/40">·</span>
                <time dateTime={post.published_at}>
                  {formatDate(post.published_at)}
                </time>
              </>
            ) : null}
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {readMinutes} min read
            </span>
          </p>
        </header>

        {/* Hero image — full-bleed-ish under the headline. */}
        {post.hero_image_url ? (
          <figure className="mx-auto mt-10 max-w-5xl">
            <div className="border-border bg-secondary relative aspect-[16/9] overflow-hidden rounded-2xl border">
              <Image
                src={post.hero_image_url}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </figure>
        ) : null}

        {/* Two-column body + sticky sidebar on lg. */}
        <div className="mx-auto mt-12 grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <div className="min-w-0">
            {/* TODO(human): attorney must review every blog post before
                publish. body_md is rendered as untrusted markdown via
                react-markdown — links/images sanitized by default. */}
            <div className="prose prose-neutral max-w-none [&_h2]:font-display [&_h3]:font-display [&_p]:text-muted-foreground [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-medium [&_h3]:mt-8 [&_h3]:scroll-mt-24 [&_h3]:text-xl [&_h3]:font-medium [&_p]:leading-relaxed [&_li]:text-muted-foreground [&_li]:leading-relaxed [&_strong]:text-foreground [&_blockquote]:border-l-primary/40 [&_blockquote]:bg-secondary/40 [&_blockquote]:not-italic [&_blockquote_p]:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  rehypeSlug,
                  [
                    rehypeAutolinkHeadings,
                    { behavior: "wrap", properties: { className: "no-underline" } },
                  ],
                ]}
              >
                {post.body_md}
              </ReactMarkdown>
            </div>

            {post.tags.length ? (
              <div className="border-border mt-12 flex flex-wrap items-center gap-2 border-t pt-6">
                <Tag className="text-muted-foreground h-4 w-4" aria-hidden />
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="border-border text-muted-foreground rounded-full border px-3 py-1 text-xs capitalize"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <footer className="border-border bg-secondary/40 mt-10 rounded-2xl border p-6 md:p-8">
              <p className="text-muted-foreground leading-relaxed">
                <span className="text-foreground font-medium">
                  Need to talk through your case?
                </span>{" "}
                Free consultation with {FIRM.attorneyName}. Call{" "}
                <a
                  href={`tel:${FIRM.phoneTel}`}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  {FIRM.phone}
                </a>{" "}
                or{" "}
                <Link
                  href={`/contact?utm_source=blog&utm_medium=footer&utm_campaign=${post.slug}`}
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  request a consultation online
                </Link>
                .
              </p>
            </footer>
          </div>

          {/* Sidebar — sticky on lg, stacks under content on mobile. */}
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            {toc.length > 0 ? <BlogToc items={toc} /> : null}

            <AuthorCard postSlug={post.slug} />

            <div>
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
                Share
              </p>
              <BlogShare url={url} title={post.title} />
            </div>

            {related.length > 0 ? (
              <div>
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
                  Related reading
                </p>
                <ul className="space-y-4">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`/blog/${r.slug}`}
                        className="group block"
                      >
                        <p className="group-hover:text-primary text-sm leading-snug font-medium transition-colors">
                          {r.title}
                        </p>
                        {r.published_at ? (
                          <time
                            dateTime={r.published_at}
                            className="text-muted-foreground text-xs"
                          >
                            {formatDate(r.published_at)}
                          </time>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </article>

      <CtaBand />
    </>
  );
}

function AuthorCard({ postSlug }: { postSlug: string }) {
  return (
    <div className="border-border bg-secondary/40 rounded-2xl border p-5">
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
        Written by
      </p>
      <p className="font-display text-base font-medium tracking-tight">
        {FIRM.attorneyName}
      </p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Founder of {FIRM.legalName} — California personal-injury and employment
        attorney based in Glendale.
      </p>
      <Link
        href={`/contact?utm_source=blog&utm_medium=sidebar&utm_campaign=${postSlug}`}
        className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        Free consultation
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
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
