import { describe, expect, it } from "vitest";

import {
  ATTRIBUTION_STORAGE_KEY,
  ATTRIBUTION_TTL_MS,
  campaignFromUrl,
  captureFirstTouch,
  channelOf,
  resolveAttribution,
} from "./attribution";

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

const SITE = "https://www.mmg-lawfirm.com";

describe("campaignFromUrl", () => {
  it("reads utm params and folds click ids into source/medium", () => {
    expect(
      campaignFromUrl(`${SITE}/guide?utm_source=google&utm_campaign=brand&gclid=abc`),
    ).toEqual({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "brand",
      gclid: "abc",
    });
    expect(campaignFromUrl(`${SITE}/?fbclid=zzz`)).toEqual({
      utm_source: "facebook",
      utm_medium: "social",
    });
    expect(campaignFromUrl("not a url")).toEqual({});
  });
});

describe("captureFirstTouch / resolveAttribution", () => {
  it("keeps the landing page and external referrer through to the contact page", () => {
    const storage = memStorage();
    const t0 = 1_000_000;
    captureFirstTouch({
      url: `${SITE}/practice-areas/car-accidents?utm_source=google&utm_medium=cpc&gclid=g1`,
      referrer: "https://www.google.com/",
      storage,
      now: t0,
    });
    // Internal navigation to /contact: no params, internal referrer.
    captureFirstTouch({
      url: `${SITE}/contact`,
      referrer: `${SITE}/practice-areas/car-accidents`,
      storage,
      now: t0 + 60_000,
    });
    const a = resolveAttribution({
      url: `${SITE}/contact`,
      referrer: `${SITE}/practice-areas/car-accidents`,
      storage,
      now: t0 + 60_000,
    });
    expect(a.utm_source).toBe("google");
    expect(a.gclid).toBe("g1");
    expect(a.referrer).toBe("https://www.google.com/");
    expect(a.landing_url).toContain("/practice-areas/car-accidents");
    expect(a.source_url).toBe(`${SITE}/contact`);
  });

  it("ignores same-site referrers and reports direct visits as such", () => {
    const storage = memStorage();
    captureFirstTouch({ url: `${SITE}/`, referrer: "", storage, now: 1 });
    const a = resolveAttribution({ url: `${SITE}/contact`, referrer: `${SITE}/`, storage, now: 2 });
    expect(a.referrer).toBeUndefined();
    expect(a.utm_source).toBeUndefined();
    expect(channelOf(a)).toBe("Direct");
  });

  it("lets a later paid click replace the stored first touch", () => {
    const storage = memStorage();
    captureFirstTouch({ url: `${SITE}/`, referrer: "https://t.co/x", storage, now: 1 });
    captureFirstTouch({
      url: `${SITE}/?utm_source=bing&utm_medium=cpc`,
      referrer: "https://www.bing.com/",
      storage,
      now: 2,
    });
    const a = resolveAttribution({ url: `${SITE}/contact`, referrer: "", storage, now: 3 });
    expect(a.utm_source).toBe("bing");
    expect(a.referrer).toBe("https://www.bing.com/");
  });

  it("expires the stored touch after the TTL", () => {
    const storage = memStorage();
    captureFirstTouch({ url: `${SITE}/?utm_source=x`, referrer: "", storage, now: 0 });
    const a = resolveAttribution({
      url: `${SITE}/contact`,
      referrer: "",
      storage,
      now: ATTRIBUTION_TTL_MS + 1,
    });
    expect(a.utm_source).toBeUndefined();
    expect(storage.getItem(ATTRIBUTION_STORAGE_KEY)).toBeNull();
  });
});

describe("channelOf", () => {
  it("classifies by click id, medium, source, then referrer", () => {
    expect(channelOf({ gclid: "x" })).toBe("Google Ads");
    expect(channelOf({ utm_source: "google", utm_medium: "cpc" })).toBe("Google Ads");
    expect(channelOf({ utm_source: "bing", utm_medium: "cpc" })).toBe("Paid Search");
    expect(channelOf({ utm_source: "facebook", utm_medium: "paid-social" })).toBe("Paid Social");
    expect(channelOf({ utm_medium: "email" })).toBe("Email");
    expect(channelOf({ referrer: "https://www.google.com/" })).toBe("Google Organic");
    expect(channelOf({ referrer: "https://duckduckgo.com/" })).toBe("Other Search");
    expect(channelOf({ utm_source: "bing", utm_medium: "organic" })).toBe("Other Search");
    expect(channelOf({ referrer: "https://m.facebook.com/" })).toBe("Social");
    expect(channelOf({ referrer: "https://www.yelp.com/biz/x" })).toBe("Social");
    expect(channelOf({ referrer: "https://avvo.com/x" })).toBe("Referral");
    expect(channelOf({ utm_source: "avvo" })).toBe("Referral");
    expect(channelOf({})).toBe("Direct");
    expect(channelOf({ referrer: "garbage" })).toBe("Direct");
  });
});
