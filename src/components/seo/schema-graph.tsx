import { buildOrganizationGraph } from "@/lib/seo/schema";

type SchemaGraphProps = {
  data?: unknown;
  id?: string;
};

export function SchemaGraph({
  data,
  id = "schema-org-graph",
}: SchemaGraphProps) {
  const json = data ?? buildOrganizationGraph();
  return (
    <script
      type="application/ld+json"
      id={id}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(json).replace(/</g, "\\u003c"),
      }}
    />
  );
}
