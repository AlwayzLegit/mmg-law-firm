import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/data/firm-settings", () => ({
  getFirmSettings: async () => ({}),
  firmSameAs: () => [],
  attorneySameAs: () => [],
}));

import { buildOrganizationGraph, buildService, FIRM_LEGAL_SERVICE_ID } from "./schema";
import { canonicalUrl } from "./canonical";

describe("single business and its services", () => {
  it.each(["car-accidents", "truck-accidents", "motorcycle-accidents"])(
    "%s describes an offering, not a second law office",
    (slug) => {
      const path = `/practice-areas/${slug}`;
      const node = buildService({ path, name: slug, serviceType: slug, areaServed: { "@type": "State", name: "California" } });
      expect(node["@type"]).toBe("Service");
      expect(node["@id"]).toBe(`${canonicalUrl(path)}#service`);
      expect(node.provider).toEqual({ "@id": FIRM_LEGAL_SERVICE_ID });
      expect(node.serviceType).toBe(slug);
      for (const key of ["parentOrganization", "address", "telephone", "priceRange", "knowsAbout"]) {
        expect(node).not.toHaveProperty(key);
      }
    },
  );

  it("retains service area and description without inventing pricing or office facts", () => {
    const areaServed = { "@type": "City" as const, name: "Salinas" };
    const node = buildService({ path: "/locations/monterey-county/salinas/motorcycle-accidents", name: "Motorcycle accidents in Salinas", description: "Existing description", areaServed });
    expect(node.areaServed).toEqual(areaServed);
    expect(node.description).toBe("Existing description");
    expect(node).not.toHaveProperty("serviceType");
  });

  it("resolves the provider to the existing firm entity with its Glendale address", async () => {
    const graph = await buildOrganizationGraph();
    const nodes = graph["@graph"] as Array<Record<string, unknown>>;
    const firm = nodes.filter((node) => node["@id"] === FIRM_LEGAL_SERVICE_ID);
    expect(firm).toHaveLength(1);
    expect(firm[0]["@type"]).toEqual(["LegalService", "Attorney"]);
    expect(firm[0].address).toMatchObject({ addressLocality: "Glendale" });
  });
});
