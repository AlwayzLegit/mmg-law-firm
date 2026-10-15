import { describe, expect, it } from "vitest";
import { V3Img } from "./v3-img";

describe("V3 image loading hints", () => {
  it("passes explicit eager loading and fetch priority without adding preload", () => {
    const image = V3Img({
      src: "uploads/assets/mihran-existing-site-portrait.jpg",
      alt: "Mihran M. Ghazaryan",
      fetchPriority: "high",
      loading: "eager",
      sizes: "(max-width: 440px) 90vw, 400px",
    });
    expect(image?.props.fetchPriority).toBe("high");
    expect(image?.props.loading).toBe("eager");
    expect(image?.props.priority).toBeUndefined();
    expect(image?.props.sizes).toBe("(max-width: 440px) 90vw, 400px");
  });

  it("does not force other images to load eagerly", () => {
    const image = V3Img({ src: "uploads/assets/mihran-existing-site-portrait.jpg", alt: "" });
    expect(image?.props.loading).toBeUndefined();
    expect(image?.props.fetchPriority).toBeUndefined();
  });
});
