import { describe, expect, it } from "vitest";

import { ATTORNEY_IMAGE_POOL, mediaUrl, pickAttorneyImage } from "@/lib/media";

describe("pickAttorneyImage", () => {
  it("always returns a pool member", () => {
    for (const seed of ["car-accidents", "los-angeles", "glendale/burbank"]) {
      expect(ATTORNEY_IMAGE_POOL).toContain(pickAttorneyImage(seed));
    }
  });

  it("is deterministic for a given seed", () => {
    expect(pickAttorneyImage("truck-accidents")).toBe(
      pickAttorneyImage("truck-accidents"),
    );
  });

  it("spreads distinct slugs across multiple pool entries", () => {
    const slugs = [
      "car-accidents",
      "truck-accidents",
      "motorcycle-accidents",
      "pedestrian-accidents",
      "slip-and-fall",
      "dog-bites",
      "wrongful-death",
      "brain-injuries",
      "los-angeles",
      "san-diego",
      "glendale/burbank",
      "orange/irvine/car-accidents",
    ];
    const picked = new Set(slugs.map(pickAttorneyImage));
    // A good hash should land these on several different photos, not one.
    expect(picked.size).toBeGreaterThanOrEqual(5);
  });
});

describe("mediaUrl", () => {
  it("encodes the object name into the public bucket path", () => {
    const url = mediaUrl("a b.png");
    expect(url).toContain("/storage/v1/object/public/media/");
    expect(url).toContain("a%20b.png");
  });
});
