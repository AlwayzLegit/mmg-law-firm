import { describe, expect, it } from "vitest";

import { ROUTED_LOCALES, localePath } from "./config";
import { consentTextFor, fmt, getDictionary } from "./index";
import { en } from "./dictionaries/en";
import { hy } from "./dictionaries/hy";
import { ru } from "./dictionaries/ru";

type Tree = { [k: string]: string | Tree };

function leaves(obj: Tree, prefix = ""): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push([path, v]);
    else out.push(...leaves(v, path));
  }
  return out;
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe("routed locale dictionaries", () => {
  const base = leaves(en as unknown as Tree);

  it.each([
    ["hy", hy],
    ["ru", ru],
  ])("%s translates every English key and keeps its placeholders", (_name, dict) => {
    const got = new Map(leaves(dict as unknown as Tree));
    for (const [path, enValue] of base) {
      const v = got.get(path);
      expect(v, path).toBeTypeOf("string");
      expect(v!.trim().length, path).toBeGreaterThan(0);
      expect(placeholders(v!), path).toEqual(placeholders(enValue));
    }
    expect(got.size).toBe(base.length);
  });

  it("keeps the firm name and bar number out of the translated strings that need them", () => {
    for (const dict of [hy, ru]) {
      expect(dict.leadForm.consent).toContain("MMG Law Firm");
      expect(dict.leadForm.consent).toContain("STOP");
      expect(dict.landing.attorneyBody).toContain("{bar}");
    }
  });

  it("never fabricates a guarantee", () => {
    const banned = [/guarantee/i, /երաշխ/i, /гарант/i];
    for (const dict of [en, hy, ru]) {
      for (const [path, v] of leaves(dict as unknown as Tree)) {
        for (const re of banned) expect(v, path).not.toMatch(re);
      }
    }
  });
});

describe("getDictionary / fmt / consentTextFor", () => {
  it("falls back to English for the Spanish stub and resolves routed locales fully", () => {
    expect(getDictionary("es").leadForm.submit).toBe(en.leadForm.submit);
    expect(getDictionary("hy").leadForm.submit).toBe(hy.leadForm.submit);
    expect(getDictionary(undefined).meta.languageName).toBe("English");
  });

  it("fills placeholders and leaves unknown ones alone", () => {
    expect(fmt("Call {phone} now {x}", { phone: "(818) 555-0100" })).toBe(
      "Call (818) 555-0100 now {x}",
    );
  });

  it("snapshots consent in the visitor's language", () => {
    expect(consentTextFor(undefined)).toBe(en.leadForm.consent);
    expect(consentTextFor("ru")).toBe(ru.leadForm.consent);
  });
});

describe("localePath", () => {
  it("prefixes routed locales and leaves English bare", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/contact")).toBe("/contact");
    expect(localePath("hy", "/")).toBe("/hy");
    expect(localePath("ru", "/contact/")).toBe("/ru/contact");
    expect(ROUTED_LOCALES).toEqual(["hy", "ru"]);
  });
});
