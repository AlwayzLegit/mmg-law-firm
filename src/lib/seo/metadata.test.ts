import { describe, expect, it } from "vitest";

import { ROUTED_LOCALES } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

import { fitMetaDescription, fitTitle } from "./metadata";

describe("fitMetaDescription", () => {
  it("leaves short descriptions alone", () => {
    expect(fitMetaDescription("Free consultation.  Call today.")).toBe("Free consultation. Call today.");
  });

  it("keeps whole sentences that fit", () => {
    const a = "A".repeat(90) + ".";
    const b = "B".repeat(80) + ".";
    expect(fitMetaDescription(`${a} ${b}`)).toBe(a);
  });

  it("does not end a sentence at a name initial", () => {
    const a = "Mihran M. Ghazaryan represents people hurt in car, truck and motorcycle crashes across California.";
    const b = "Free consultation, and no fee unless we recover compensation for you in the end.";
    expect(fitMetaDescription(`${a} ${b}`)).toBe(a);
  });

  it("splits Armenian text at ։ and keeps the initial with the name", () => {
    const a = "Միհրան Մ. Ղազարյանը ներկայացնում է Կալիֆոռնիայում ավտոմեքենայի, բեռնատարի և մոտոցիկլետի վթարներից տուժածներին։";
    const b = "Անվճար խորհրդատվություն Գլենդեյլի գրասենյակում կամ հեռախոսով, հայերեն, ռուսերեն կամ անգլերեն լեզուներով։";
    expect(fitMetaDescription(`${a} ${b}`)).toBe(a);
  });

  it("cuts a single long sentence at a word boundary with an ellipsis", () => {
    const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const out = fitMetaDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it("keeps a real description for every localized page", () => {
    for (const locale of ROUTED_LOCALES) {
      const { meta } = getDictionary(locale);
      for (const d of [meta.homeDescription, meta.contactDescription]) {
        expect(fitMetaDescription(d).length, `${locale}: ${d.slice(0, 30)}`).toBeGreaterThanOrEqual(70);
      }
    }
  });
});

describe("fitTitle", () => {
  it("keeps the full brand suffix when it fits", () => {
    expect(fitTitle("California Car Accident Lawyer")).toBe("California Car Accident Lawyer");
  });
  it("shortens the suffix for long titles", () => {
    const t = "Swimming Pool Accident Lawyer California: Who Is Liable";
    expect(fitTitle(t)).toEqual({ absolute: `${t} | MMG` });
  });
  it("drops the suffix when even the short one is too long", () => {
    const t = "A very long blog headline that already uses up the whole budget!";
    expect(fitTitle(t)).toEqual({ absolute: t });
  });
});
