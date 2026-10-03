import type { TocItem } from "@/lib/blog/toc";

/**
 * "On this page" outline — anchor links to the post's h2/h3 headings.
 * IDs match what `rehype-slug` puts on the rendered headings, so each link
 * jumps to the matching section.
 */
export function BlogToc({ items, label = "On this page" }: { items: TocItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="text-sm">
      <p className="micro-label text-stone m-0">{label}</p>
      <ol className="m-0 mt-2.5 grid list-none gap-1.5 p-0">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`border-ink/10 hover:border-gold text-foreground block border-l-2 py-1.5 pl-3 text-[13.5px] leading-snug no-underline transition-colors ${
                it.level === 3 ? "ml-3" : ""
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
