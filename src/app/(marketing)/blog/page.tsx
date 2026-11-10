import { buildMetadata } from "@/lib/seo/metadata";

import { BlogIndexView } from "./blog-index-view";

export const metadata = buildMetadata({
  title: "California Personal Injury Blog",
  description:
    "Articles on California personal-injury law, claim process, and what to do after an accident — written by Mihran M. Ghazaryan.",
  path: "/blog",
});

export const revalidate = 3600;

export default function BlogIndexPage() {
  return <BlogIndexView page={1} />;
}
