import { jsonLd } from "@/lib/seo/json-ld";
import { buildBreadcrumbList, type Crumb } from "@/lib/seo/schema";

type Props = {
  crumbs: Crumb[];
};

export function BreadcrumbJsonLd({ crumbs }: Props) {
  if (crumbs.length === 0) return null;
  const data = buildBreadcrumbList(crumbs);
  return (
    <script
      type="application/ld+json"
      id="breadcrumb-jsonld"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
