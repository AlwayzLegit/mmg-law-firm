import type { TocItem } from "@/lib/blog/toc";

/**
 * "In this article" outline — anchor links to the post's h2/h3 headings.
 * IDs match what `rehype-slug` puts on the rendered headings, so each link
 * jumps to the matching section.
 */
export function BlogToc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="In this article" className="text-sm">
      <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
        In this article
      </p>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li
            key={it.id}
            className={it.level === 3 ? "pl-3" : undefined}
          >
            <a
              href={`#${it.id}`}
              className="text-muted-foreground hover:text-primary block leading-snug transition-colors"
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
