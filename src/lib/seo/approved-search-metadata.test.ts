import { describe, expect, it } from "vitest";
import { buildMetadata } from "./metadata";

describe("owner-approved search metadata", () => {
  it("uses the complete approved title without appending the layout suffix", () => {
    const result = buildMetadata({ path: "/", title: "Original headline", description: "Original description." });
    expect(result.title).toEqual({ absolute: "California Car, Truck & Motorcycle Accident Lawyer | MMG" });
    expect(result.description).toBe("Injured in a California car, truck or motorcycle accident? Speak with MMG Law Firm about your claim. Glendale office. Request a free consultation.");
    expect(result.openGraph?.title).toBe("Original headline | MMG Law Firm");
    expect(result.openGraph?.description).toBe("Original description.");
  });

  it("does not override missing or unpublished content", () => {
    const result = buildMetadata({ path: "/blog/wrongful-termination-lawyer-california", title: "Post not found", description: "We couldn't find this post.", noindex: true });
    expect(result.title).toBe("Post not found");
    expect(result.description).toBe("We couldn't find this post.");
    expect(result.robots).toEqual({ index: false, follow: false });
  });

  it("preserves frozen metadata outside the approved URL list", () => {
    const result = buildMetadata({ path: "/practice-areas/car-accidents", title: "Existing title", description: "Existing description." });
    expect(result.title).toBe("Existing title");
    expect(result.description).toBe("Existing description.");
  });
});
