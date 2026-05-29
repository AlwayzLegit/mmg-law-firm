import { jsonLd } from "@/lib/seo/json-ld";
import { buildOrganizationGraph } from "@/lib/seo/schema";

type SchemaGraphProps = {
  data?: unknown;
  id?: string;
};

export async function SchemaGraph({
  data,
  id = "schema-org-graph",
}: SchemaGraphProps) {
  const json = data ?? (await buildOrganizationGraph());
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{ __html: jsonLd(json) }}
    />
  );
}
