import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { ArrowRight, ArrowUpRight, Clock, Tag } from "lucide-react";

import { BlogShare } from "@/components/marketing/blog-share";
import { BlogToc } from "@/components/marketing/blog-toc";
import { CtaBand } from "@/components/marketing/cta-band";
import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { buttonVariants } from "@/components/ui/button";
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

  const initials = post.author_name
    .split(/\s+/)
    .filter((p) => p.length > 1)
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJson) }} />

      <article className="container-page pt-[clamp(16px,2.5vw,32px)] pb-24">
        <nav aria-label="Breadcrumb">
          <ol className="text-stone m-0 flex list-none flex-wrap gap-2 p-0 text-xs tracking-[0.1em] uppercase">
            <li>
              <Link href="/" className="hover:text-foreground no-underline transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/blog" className="hover:text-foreground no-underline transition-colors">
                Blog
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="text-gold-deep normal-case" aria-current="page">
              {post.title}
            </li>
          </ol>
        </nav>

        <header className="mx-auto mt-8 max-w-[820px] text-center">
          {post.tags.length ? (
            <p className="micro-label text-gold-deep m-0 tracking-[0.16em]">{post.tags.slice(0, 2).join(" · ")} · California</p>
          ) : null}
          <h1 className="mt-3.5 text-[clamp(36px,5vw,60px)] leading-[1.05] font-semibold tracking-[-0.025em]">{post.title}</h1>
          {post.subtitle ? <p className="text-stone mt-4 text-lg leading-[1.55]">{post.subtitle}</p> : null}
          <p className="text-stone mt-5 flex flex-wrap items-center justify-center gap-3 text-[13.5px]">
            <span className="inline-flex items-center gap-2">
              <span className="bg-ink text-gold inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-[11px] font-semibold">
                {initials}
              </span>
              <strong className="text-foreground font-semibold">{post.author_name}</strong>
            </span>
            {post.published_at ? (
              <>
                <span aria-hidden>·</span>
                <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-[13px] w-[13px]" aria-hidden />
              {readMinutes} min read
            </span>
          </p>
        </header>

        {post.hero_image_url ? (
          <figure className="mx-auto mt-9 max-w-[1040px]">
            <div className="bg-ink-soft relative aspect-[16/8] overflow-hidden rounded-[20px]">
              <Image
                src={post.hero_image_url}
                alt={post.title}
                fill
                sizes="(min-width: 1024px) 1040px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          </figure>
        ) : null}

        <div className="mx-auto mt-12 grid max-w-[1140px] items-start gap-14 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 max-w-[720px]">
            {/* TODO(human): attorney must review every blog post before
                publish. body_md is rendered as untrusted markdown via
                react-markdown — links/images sanitized by default. */}
            <div className="prose-v2 blog-body text-[17.5px] leading-[1.75]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: "wrap", properties: { className: "no-underline" } }],
                ]}
              >
                {post.body_md}
              </ReactMarkdown>
            </div>

            {post.tags.length ? (
              <div className="border-line-strong mt-8 flex flex-wrap items-center gap-2 border-t pt-5">
                <Tag className="text-stone h-3.5 w-3.5" aria-hidden />
                {post.tags.map((t) => (
                  <span key={t} className="border-line-strong text-stone rounded-full border px-3 py-[5px] text-xs capitalize">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}

            <footer className="surface-ink bg-background text-foreground mt-7 flex flex-wrap items-center justify-between gap-5 rounded-2xl px-7 py-6">
              <p className="text-cream/85 m-0 max-w-[46ch] text-[15.5px]">
                <strong className="text-gold font-semibold">Need to talk through your case?</strong> Free consultation
                with {FIRM.attorneyName} — call{" "}
                <a href={`tel:${FIRM.phoneTel}`} className="text-cream font-semibold no-underline">
                  {FIRM.phone}
                </a>{" "}
                or{" "}
                <Link
                  href={`/contact?utm_source=blog&utm_medium=footer&utm_campaign=${post.slug}`}
                  className="text-cream font-semibold underline-offset-4 hover:underline"
                >
                  request a consultation online
                </Link>
                .
              </p>
              <Link
                href={`/contact?utm_source=blog&utm_medium=footer&utm_campaign=${post.slug}`}
                className={buttonVariants({ variant: "gold", size: "pill-sm" })}
              >
                Request consultation
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </footer>
          </div>

          <aside className="grid gap-3.5 lg:sticky lg:top-[92px]">
            {toc.length > 0 ? (
              <div className="bg-card border-line rounded-[14px] border px-5 py-[18px]">
                <BlogToc items={toc} />
              </div>
            ) : null}

            <AuthorCard postSlug={post.slug} />

            <div className="bg-card border-line rounded-[14px] border px-5 py-[18px]">
              <p className="micro-label text-stone m-0">Share</p>
              <div className="mt-2.5">
                <BlogShare url={url} title={post.title} />
              </div>
            </div>

            {related.length > 0 ? (
              <div className="bg-card border-line rounded-[14px] border px-5 py-[18px]">
                <p className="micro-label text-stone m-0">Related reading</p>
                <ul className="m-0 mt-2.5 grid list-none gap-2.5 p-0">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/blog/${r.slug}`} className="group text-foreground block no-underline">
                        <p className="group-hover:text-gold-deep m-0 text-sm leading-[1.35] font-semibold transition-colors">{r.title}</p>
                        {r.published_at ? (
                          <time dateTime={r.published_at} className="text-stone text-xs">
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
    <div className="surface-ink bg-background text-foreground rounded-[14px] px-5 py-[18px]">
      <p className="micro-label text-gold m-0">Written by</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="relative block h-12 w-12 flex-none overflow-hidden rounded-full bg-[#dfe6f5]">
          <Image src="/attorney-headshot.webp" alt="" fill sizes="48px" className="object-cover object-top" />
        </span>
        <span>
          <span className="font-display text-cream block text-[17px] leading-[1.2] font-semibold">{FIRM.attorneyName}</span>
          <span className="text-cream/60 mt-0.5 block text-xs">
            Founder, {FIRM.legalName} · {FIRM.address.city}
          </span>
        </span>
      </div>
      <Link
        href={`/contact?utm_source=blog&utm_medium=sidebar&utm_campaign=${postSlug}`}
        className="text-gold hover:text-gold-light mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold no-underline transition-colors"
      >
        Free consultation
        <ArrowUpRight className="h-[13px] w-[13px]" aria-hidden />
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
