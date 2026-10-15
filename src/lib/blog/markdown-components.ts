import type { Components } from "react-markdown";

// The article template owns the page's H1. Imported Markdown may contain
// another title; retain its wording and anchor while making it a section.
export const BLOG_MARKDOWN_COMPONENTS = { h1: "h2" } satisfies Components;
