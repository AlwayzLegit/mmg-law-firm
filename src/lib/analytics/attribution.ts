/**
 * Lead-source attribution, client-safe and dependency-free.
 *
 * Problem this solves: the lead form used to read UTM parameters from the
 * page the form was on and `document.referrer` of that page. A visitor who
 * lands on a guide from a Google ad, reads it, then clicks "Contact" lost
 * the campaign (no params on /contact) and showed an internal referrer. So
 * the firm could not tell which channel a case came from.
 *
 * Fix: capture the *first touch* on landing (campaign params, external
 * referrer, landing page) and keep it in localStorage for 30 days. The form
 * then submits the first touch alongside the page it was submitted from. A
 * later visit that carries campaign parameters replaces the stored touch
 * (last paid click wins), which is how ad platforms expect to be credited.
 */

export const ATTRIBUTION_STORAGE_KEY = "mmg_attribution_v1";
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const CAMPAIGN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;
type CampaignParam = (typeof CAMPAIGN_PARAMS)[number];

/** Click ids other than gclid that still mean "paid click" for channel
 *  detection. They are mapped onto utm_source/medium when those are absent. */
const CLICK_IDS: Record<string, { source: string; medium: string }> = {
  gclid: { source: "google", medium: "cpc" },
  gbraid: { source: "google", medium: "cpc" },
  wbraid: { source: "google", medium: "cpc" },
  msclkid: { source: "bing", medium: "cpc" },
  fbclid: { source: "facebook", medium: "social" },
  ttclid: { source: "tiktok", medium: "social" },
};

export type FirstTouch = Partial<Record<CampaignParam, string>> & {
  /** External referrer at first landing (empty for direct / same-site). */
  referrer?: string;
  /** Full URL of the first page of the visit. */
  landing_url?: string;
  /** Epoch ms when captured. */
  captured_at: number;
};

/** Every key a lead form may submit from `resolveAttribution`. */
export const ATTRIBUTION_FIELDS = [
  ...CAMPAIGN_PARAMS,
  "referrer",
  "landing_url",
  "source_url",
] as const;

export type Attribution = Partial<Record<CampaignParam, string>> & {
  referrer?: string;
  landing_url?: string;
  /** The page the form was submitted from. */
  source_url?: string;
};

function isExternalReferrer(referrer: string, host: string): boolean {
  if (!referrer) return false;
  try {
    const r = new URL(referrer).hostname.replace(/^www\./, "");
    return r !== host.replace(/^www\./, "");
  } catch {
    return false;
  }
}

/** Campaign fields present on a URL, with click ids folded into utm_*. */
export function campaignFromUrl(url: string): Partial<Record<CampaignParam, string>> {
  const out: Partial<Record<CampaignParam, string>> = {};
  let sp: URLSearchParams;
  try {
    sp = new URL(url).searchParams;
  } catch {
    return out;
  }
  for (const k of CAMPAIGN_PARAMS) {
    const v = sp.get(k)?.trim();
    if (v) out[k] = v.slice(0, 120);
  }
  for (const [id, map] of Object.entries(CLICK_IDS)) {
    if (!sp.get(id)) continue;
    out.utm_source ??= map.source;
    out.utm_medium ??= map.medium;
  }
  return out;
}

function hasCampaign(c: Partial<Record<CampaignParam, string>>): boolean {
  return Boolean(c.utm_source || c.utm_medium || c.utm_campaign || c.gclid);
}

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function readStored(storage: StorageLike, now: number): FirstTouch | null {
  try {
    const raw = storage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirstTouch;
    if (
      typeof parsed?.captured_at !== "number" ||
      now - parsed.captured_at > ATTRIBUTION_TTL_MS
    ) {
      storage.removeItem(ATTRIBUTION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Record the first touch of a visit. Call once per page load on public
 * pages. Pure given its inputs so it can be unit-tested; the browser wrapper
 * passes `location.href`, `document.referrer` and `localStorage`.
 */
export function captureFirstTouch(input: {
  url: string;
  referrer: string;
  storage: StorageLike;
  now?: number;
}): FirstTouch {
  const now = input.now ?? Date.now();
  const existing = readStored(input.storage, now);
  const campaign = campaignFromUrl(input.url);

  // Keep the stored touch unless this visit carries campaign parameters
  // (a new paid click should be credited) or nothing is stored yet.
  if (existing && !hasCampaign(campaign)) return existing;

  let host = "";
  try {
    host = new URL(input.url).hostname;
  } catch {
    /* keep empty */
  }
  const touch: FirstTouch = {
    ...campaign,
    landing_url: input.url.slice(0, 2000),
    captured_at: now,
  };
  if (isExternalReferrer(input.referrer, host)) {
    touch.referrer = input.referrer.slice(0, 2000);
  }
  try {
    input.storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(touch));
  } catch {
    /* storage can be full or blocked; attribution is best-effort */
  }
  return touch;
}

/**
 * What the lead form submits: the stored first touch, with the current
 * page's own campaign parameters taking precedence, plus the submit page.
 */
export function resolveAttribution(input: {
  url: string;
  referrer: string;
  storage: StorageLike;
  now?: number;
}): Attribution {
  const now = input.now ?? Date.now();
  const stored = readStored(input.storage, now);
  const current = campaignFromUrl(input.url);
  let host = "";
  try {
    host = new URL(input.url).hostname;
  } catch {
    /* keep empty */
  }
  const out: Attribution = {
    ...(stored
      ? (Object.fromEntries(
          Object.entries(stored).filter(([k]) => k !== "captured_at"),
        ) as Partial<FirstTouch>)
      : {}),
    ...current,
    source_url: input.url.slice(0, 2000),
  };
  if (!out.referrer && isExternalReferrer(input.referrer, host)) {
    out.referrer = input.referrer.slice(0, 2000);
  }
  if (!out.landing_url) out.landing_url = input.url.slice(0, 2000);
  return out;
}

/** Browser convenience: capture on landing. No-op outside a browser. */
export function captureFirstTouchInBrowser(): void {
  if (typeof window === "undefined") return;
  try {
    captureFirstTouch({
      url: window.location.href,
      referrer: document.referrer,
      storage: window.localStorage,
    });
  } catch {
    /* private mode / blocked storage */
  }
}

/** Browser convenience for the lead form. */
export function readAttributionInBrowser(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    return resolveAttribution({
      url: window.location.href,
      referrer: document.referrer,
      storage: window.localStorage,
    });
  } catch {
    return { source_url: window.location.href };
  }
}

export type Channel =
  | "Google Ads"
  | "Google Organic"
  | "Bing Organic"
  | "Paid Social"
  | "Social"
  | "Paid Search"
  | "Email"
  | "Referral"
  | "Direct";

const SEARCH_HOSTS = [
  ["google.", "Google Organic"],
  ["bing.com", "Bing Organic"],
  ["yahoo.", "Bing Organic"],
  ["duckduckgo.com", "Bing Organic"],
] as const;
const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "reddit.com",
  "nextdoor.com",
  "yelp.com",
];

/**
 * Human channel for reporting, derived at read time from what was captured
 * (so older leads classify too). Precedence: click ids, then utm_medium /
 * utm_source, then the referrer host, else Direct.
 */
export function channelOf(lead: {
  utm_source?: string | null;
  utm_medium?: string | null;
  gclid?: string | null;
  referrer?: string | null;
}): Channel {
  const source = (lead.utm_source ?? "").toLowerCase();
  const medium = (lead.utm_medium ?? "").toLowerCase();
  if (lead.gclid) return "Google Ads";
  if (/^(cpc|ppc|paid|paidsearch|sem)$/.test(medium)) {
    return source.includes("google") ? "Google Ads" : "Paid Search";
  }
  if (/paid[-_ ]?social/.test(medium)) return "Paid Social";
  if (medium === "social" || /facebook|instagram|linkedin|tiktok/.test(source)) {
    return "Social";
  }
  if (medium === "email" || source === "email" || source === "newsletter") {
    return "Email";
  }
  if (medium === "organic" || source === "google") return "Google Organic";
  if (source === "bing") return "Bing Organic";
  if (medium === "referral" || (source && !medium)) return "Referral";

  let host = "";
  try {
    if (lead.referrer) host = new URL(lead.referrer).hostname.toLowerCase();
  } catch {
    /* unparsable referrer → Direct */
  }
  if (host) {
    for (const [needle, channel] of SEARCH_HOSTS) {
      if (host.includes(needle)) return channel;
    }
    if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return "Social";
    }
    return "Referral";
  }
  return "Direct";
}
