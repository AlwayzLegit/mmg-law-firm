import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { BreadcrumbJsonLd } from "@/components/seo/breadcrumb-jsonld";
import { FIRM, FIRM_FULL_ADDRESS } from "@/lib/constants";
import { extractToc } from "@/lib/blog/toc";
import type { ResolvedLegalPage } from "@/lib/data/legal-page-queries";
import { LEGAL_PAGE_FALLBACKS, LEGAL_PAGE_SLUGS } from "@/lib/data/legal-pages";
import { cn } from "@/lib/utils";

import { BlogToc } from "./blog-toc";

type Props = {
  page: ResolvedLegalPage;
};

/**
 * Shared presentation for the four legal pages (redesign v2): paper header
 * with breadcrumb, title, "Last reviewed", tab pills across the four pages;
 * body (Markdown, ids from rehype-slug) beside a sticky "On this page" list;
 * contact panel at the end. The "Effective" and "Last reviewed" lines only
 * appear when the row came from the DB and the attorney filled them in.
 */
export function LegalPagePresentation({ page }: Props) {
  const toc = extractToc(page.body_md).filter((t) => t.level === 2);
  return (
    <>
      <BreadcrumbJsonLd
        crumbs={[
          { name: "Home", path: "/" },
          { name: page.title, path: `/legal/${page.slug}` },
        ]}
      />
      <header className="border-line border-b">
        <div className="container-page pt-[clamp(16px,2.5vw,32px)] pb-[clamp(40px,6vw,56px)]">
          <nav aria-label="Breadcrumb">
            <ol className="text-stone m-0 flex list-none flex-wrap gap-2 p-0 text-xs tracking-[0.1em] uppercase">
              <li>
                <Link href="/" className="hover:text-foreground no-underline transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>Legal</li>
              <li aria-hidden>/</li>
              <li className="text-gold-deep" aria-current="page">
                {page.title}
              </li>
            </ol>
          </nav>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-[clamp(36px,5vw,60px)] leading-[1.05] font-semibold tracking-[-0.025em]">{page.title}</h1>
              {page.subtitle ? <p className="text-stone mt-2 text-sm">{page.subtitle}</p> : null}
            </div>
            {page.effective_date || page.last_reviewed_at ? (
              <p className="text-stone m-0 text-[13px]">
                {page.effective_date ? (
                  <>
                    Effective <strong className="text-foreground font-semibold">{formatDate(page.effective_date)}</strong>
                  </>
                ) : null}
                {page.effective_date && page.last_reviewed_at ? " · " : null}
                {page.last_reviewed_at ? (
                  <>
                    Last reviewed <strong className="text-foreground font-semibold">{formatDate(page.last_reviewed_at)}</strong>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
          <nav aria-label="Legal pages" className="mt-5 flex flex-wrap gap-1.5">
            {LEGAL_PAGE_SLUGS.map((slug) => {
              const on = slug === page.slug;
              return (
                <Link
                  key={slug}
                  href={`/legal/${slug}`}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold no-underline transition-colors",
                    on ? "bg-ink border-ink text-cream" : "bg-card border-ink/20 text-foreground hover:border-ink",
                  )}
                >
                  {LEGAL_PAGE_FALLBACKS[slug].title}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <article className="container-page grid items-start gap-14 pt-[clamp(40px,6vw,64px)] pb-24 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 max-w-[760px]">
          <div className="prose-v2 legal-body text-[16.5px] leading-[1.75]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
              {page.body_md}
            </ReactMarkdown>
          </div>
          <p className="surface-paper-2 bg-background text-stone mt-10 rounded-[14px] px-[22px] py-[18px] text-sm">
            Questions about this policy? Email{" "}
            <a href={`mailto:${FIRM.email}`} className="text-foreground font-semibold">
              {FIRM.email}
            </a>{" "}
            or write to {FIRM.legalName}, {FIRM_FULL_ADDRESS}.
          </p>
        </div>
        {toc.length > 0 ? (
          <aside className="bg-card border-line rounded-[14px] border px-5 py-[18px] lg:sticky lg:top-[92px]">
            <BlogToc items={toc} />
          </aside>
        ) : null}
      </article>
    </>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
