import { describe, expect, it } from "vitest";

import { FIRM } from "@/lib/constants";
import { officeCityFirst } from "./office-city-first";

describe("officeCityFirst", () => {
  it("puts the office city first and the rest in alphabetical order", () => {
    const pages = ["Pasadena", "Alturas", FIRM.address.city, "Burbank"].map((city_name) => ({ city_name }));
    expect(officeCityFirst(pages).map((p) => p.city_name)).toEqual([
      FIRM.address.city,
      "Alturas",
      "Burbank",
      "Pasadena",
    ]);
  });

  it("leaves the input alone and copes without an office page", () => {
    const pages = [{ city_name: "Burbank" }, { city_name: "Alturas" }];
    expect(officeCityFirst(pages).map((p) => p.city_name)).toEqual(["Alturas", "Burbank"]);
    expect(pages[0].city_name).toBe("Burbank");
  });
});
