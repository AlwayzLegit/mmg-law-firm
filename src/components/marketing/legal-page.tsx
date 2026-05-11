import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ResolvedLegalPage } from "@/lib/data/legal-page-queries";

type Props = {
  page: ResolvedLegalPage;
};

/**
 * Shared presentation for the four legal pages. Markdown body rendered with
 * the same prose styling that's applied across the site. The "Effective" and
 * "Last reviewed" lines only appear when the row came from the DB and the
 * attorney filled them in.
 */
export function LegalPagePresentation({ page }: Props) {
  return (
    <article className="container-prose py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Legal
      </p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
        {page.title}
      </h1>
      {page.subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{page.subtitle}</p>
      ) : null}
      {page.effective_date ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Effective {formatDate(page.effective_date)}
        </p>
      ) : null}
      {page.last_reviewed_at ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Last reviewed {formatDate(page.last_reviewed_at)}
        </p>
      ) : null}

      <div className="prose prose-neutral mt-10 max-w-none [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-foreground [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_li]:leading-relaxed [&_li]:text-muted-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {page.body_md}
        </ReactMarkdown>
      </div>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
