import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CtaBand } from "@/components/marketing/cta-band";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM } from "@/lib/constants";
import { getPostBySlug, getPublishedPosts } from "@/lib/data/blog";
import { defaultOgImageUrl } from "@/lib/seo/canonical";
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

      <article className="container-prose py-16 md:py-20">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <span className="text-muted-foreground/50 mx-1.5">/</span>
          <Link href="/blog" className="hover:text-primary">
            Blog
          </Link>
        </nav>

        <header className="mt-6">
          <h1 className="font-display text-4xl font-medium tracking-tight md:text-5xl">
            {post.title}
          </h1>
          {post.subtitle ? (
            <p className="text-muted-foreground mt-4 text-lg">
              {post.subtitle}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-4 text-sm">
            {post.author_name}
            {post.published_at ? (
              <>
                {" · "}
                <time dateTime={post.published_at}>
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
              </>
            ) : null}
          </p>
        </header>

        {/* TODO(human): attorney must review every blog post before
            publish. body_md is rendered as untrusted markdown via
            react-markdown — links and images are sanitized by default. */}
        <div className="prose prose-neutral [&_h2]:font-display [&_h3]:font-display [&_p]:text-muted-foreground [&_a]:text-primary mt-10 max-w-none [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-medium [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-medium [&_p]:leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.body_md}
          </ReactMarkdown>
        </div>

        <footer className="border-border bg-secondary/40 mt-12 rounded-2xl border p-6">
          <p className="text-muted-foreground text-sm">
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
      </article>

      <CtaBand />
    </>
  );
}
