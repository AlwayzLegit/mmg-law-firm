#!/usr/bin/env node
/**
 * Search results report: what Google shows people for this site.
 *
 * Copied from AlwayzLegit/weedtip scripts/search-report/report.mjs at df9fdbe
 * (OPS-24) for MMG Law (OPS-37), then changed in five places: it exits 0 with
 * one line when the secret is missing, it finds the Search Console property
 * for GSC_DOMAIN itself, it leaves the coverage section out when there is no
 * coverage file, and, because this repository is public, it never prints or
 * stores a search term unless SHOW_SEARCH_TERMS is exactly "true".
 *
 * Reads the Search Console API (Search Analytics query, final data only, read
 * only scope) and writes one report to the job summary: the last 28 days
 * against the 28 before, the top searches and pages, the biggest movers, the
 * searches sitting at position 5 to 20 (the cheapest wins), pages that get
 * seen but not clicked, and (when a coverage file is given) indexed against
 * not indexed. The same numbers, already filtered, go to search-report.json.
 * Search terms (top searches, movers, position 5 to 20) are withheld unless
 * SHOW_SEARCH_TERMS is "true": see "Public repository rule" below.
 *
 * One alarm, which exits 1 and prints "ALARM impressions": the 2 newest final
 * days are both below 30 percent of their weekday baseline (the average of
 * the same weekday in the 4 weeks before), and that baseline is at least 100
 * impressions a day. Search Console's final data is about 2 days behind, so no
 * run can say "today"; the workflow runs three times a week. Everything else
 * is a finding.
 *
 * Auth: a service account key in GSC_SERVICE_ACCOUNT_JSON, signed locally with
 * node crypto (the same flow as apps/web/scripts/gsc-inspect.mjs, copied here
 * on purpose so that file's auth is not touched). Scope is read only. The key
 * is never printed: a failed call prints its HTTP status number and nothing
 * from the response.
 *
 * No site specific code: the property comes from GSC_SITE_URL, or is found by
 * asking Search Console which properties the service account can read and
 * taking the one for GSC_DOMAIN. With no coverage file there is no Coverage
 * section.
 *
 * Public repository rule: every job summary, log line and stored file of a
 * public repository can be read by anyone, for good. A personal name in a
 * search (the other driver, an insurer, a case) cannot be detected with
 * certainty, so unless SHOW_SEARCH_TERMS is exactly "true" no search term is
 * printed or stored. Totals, counts and the site's own page addresses stay.
 *
 * Not configured: with no GSC_SERVICE_ACCOUNT_JSON the run prints one notice
 * line, writes no file and exits 0. That is not proof the report works.
 *
 * Usage: node report.mjs [--report] [--coverage coverage-summary.json]
 *                        [--previous search-report.json] [--out search-report.json]
 *   --report  also write the full report (the alarm check runs on every run)
 * Env: GSC_SERVICE_ACCOUNT_JSON, GSC_DOMAIN (e.g. mmg-lawfirm.com),
 *      GSC_SITE_URL (optional, overrides the property search),
 *      SHOW_SEARCH_TERMS ("true" shows search terms, anything else withholds)
 * Exit: 0 ok or not configured, 1 ALARM impressions, 2 the run itself broke.
 */
import crypto from "node:crypto";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { fileURLToPath } from "node:url";

export const T = {
  alarmFraction: 0.3,
  alarmMinBaseline: 100,
  minQueryImpressions: 20,
  rankMinPos: 5,
  rankMaxPos: 20,
  rankMinImpressions: 50,
  ctrMinImpressions: 500,
  ctrMax: 0.01,
  top: 20,
  movers: 10,
  windowDays: 28,
  // Search Console's final data trails by 2 to 3 days. The alarm treats this many
  // days back from today as the newest day that should exist, so days with no
  // impressions at all (which Search Console leaves out) count as zero.
  finalLagDays: 3,
  pageRows: 1000,
  maxPages: 10,
};

const DAY = 24 * 60 * 60 * 1000;
export const addDays = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY)
    .toISOString()
    .slice(0, 10);

// ─── The alarm ─────────────────────────────────────────────────────────────
/**
 * rows: [{ date: "YYYY-MM-DD", impressions }] from a date query (final data).
 * Days Search Console leaves out had no impressions and count as 0.
 * boundary: the newest day that should exist ("YYYY-MM-DD"). Without it a total
 * drop to zero would move the check back to the last day that had traffic.
 */
export function alarm(rows, boundary = null) {
  const byDate = new Map(rows.map((r) => [r.date, r.impressions]));
  const dates = [...byDate.keys()].sort();
  if (!dates.length) return { alarm: false, enough: false, days: [] };
  const last = boundary && boundary > dates.at(-1) ? boundary : dates.at(-1);
  const days = [addDays(last, -1), last].map((date) => {
    const baseline =
      [1, 2, 3, 4].reduce(
        (sum, k) => sum + (byDate.get(addDays(date, -7 * k)) ?? 0),
        0,
      ) / 4;
    return { date, impressions: byDate.get(date) ?? 0, baseline };
  });
  // The history must reach back 4 weeks before the older of the two days.
  const enough = dates[0] <= addDays(last, -29);
  const low = days.every(
    (d) =>
      d.baseline >= T.alarmMinBaseline &&
      d.impressions < T.alarmFraction * d.baseline,
  );
  return { alarm: enough && low, enough, days };
}

// ─── Privacy filter ────────────────────────────────────────────────────────
const digitCount = (s) => (s.match(/\d/g) ?? []).length;
/** A term that looks like an email address or a phone number. */
export const looksPersonal = (s) => s.includes("@") || digitCount(s) >= 7;

/**
 * Applied before anything is printed or stored. A query is shown only when it
 * has at least 20 impressions in the period and holds no "@" and fewer than 7
 * digits. A personal name cannot be detected with certainty: the impression
 * floor is the control for that.
 */
export function filterQueries(rows) {
  const kept = [];
  let withheld = 0;
  for (const r of rows) {
    if (looksPersonal(r.key) || r.impressions < T.minQueryImpressions)
      withheld += 1;
    else kept.push(r);
  }
  return { kept, withheld };
}

export function filterPages(rows) {
  const kept = rows.filter((r) => !looksPersonal(r.key));
  return { kept, withheld: rows.length - kept.length };
}

// ─── Maths ─────────────────────────────────────────────────────────────────
export function totals(dayRows) {
  const clicks = dayRows.reduce((s, r) => s + r.clicks, 0);
  const impressions = dayRows.reduce((s, r) => s + r.impressions, 0);
  const weighted = dayRows.reduce((s, r) => s + r.position * r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? weighted / impressions : 0,
  };
}

/**
 * Merge two periods by key. A key that is new this period has isNew true and
 * counts as 0 clicks before.
 */
export function compare(now, before) {
  const prev = new Map(before.map((r) => [r.key, r]));
  return now.map((r) => {
    const p = prev.get(r.key);
    return {
      ...r,
      prevClicks: p?.clicks ?? 0,
      prevPosition: p?.position ?? null,
      dClicks: r.clicks - (p?.clicks ?? 0),
      dPosition: p ? r.position - p.position : null,
      isNew: !p,
    };
  });
}

const byClicks = (a, b) => b.clicks - a.clicks || b.impressions - a.impressions;

export function shapeReport({
  nowQueries,
  beforeQueries,
  nowPages,
  beforePages,
  showTerms = false,
}) {
  const q = filterQueries(nowQueries);
  const qb = filterQueries(beforeQueries).kept;
  const p = filterPages(nowPages);
  const pb = filterPages(beforePages).kept;
  const queries = compare(q.kept, qb);
  const pages = compare(p.kept, pb);
  const movers = (rows) => ({
    gainers: [...rows]
      .filter((r) => r.dClicks > 0)
      .sort((a, b) => b.dClicks - a.dClicks)
      .slice(0, T.movers),
    losers: [...rows]
      .filter((r) => r.dClicks < 0)
      .sort((a, b) => a.dClicks - b.dClicks)
      .slice(0, T.movers),
  });
  // Public repository rule: unless showTerms is true, no search term leaves
  // this function. Only the count of searches does.
  const noMovers = { gainers: [], losers: [] };
  return {
    termsShown: showTerms === true,
    queryCount: q.kept.length,
    topQueries: showTerms ? [...queries].sort(byClicks).slice(0, T.top) : [],
    topPages: [...pages].sort(byClicks).slice(0, T.top),
    queryMovers: showTerms ? movers(queries) : noMovers,
    cheapWins: showTerms
      ? queries
          .filter(
            (r) =>
              r.position >= T.rankMinPos &&
              r.position <= T.rankMaxPos &&
              r.impressions >= T.rankMinImpressions,
          )
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, T.top)
      : [],
    poorCtr: pages
      .filter(
        (r) =>
          r.impressions >= T.ctrMinImpressions &&
          r.clicks / r.impressions < T.ctrMax,
      )
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, T.top),
    withheldQueries: q.withheld,
    withheldPages: p.withheld,
  };
}

const INDEXED = /^(submitted and indexed|indexed, not submitted in sitemap)$/i;
/** coverage: { writtenAt, counts: { state: n } } written by gsc-inspect. No URL in it. */
export function coverageLine(coverage) {
  if (!coverage?.counts) return null;
  let indexed = 0;
  let total = 0;
  for (const [state, n] of Object.entries(coverage.counts)) {
    total += n;
    if (INDEXED.test(state)) indexed += n;
  }
  return `Coverage: ${indexed} indexed, ${total - indexed} not indexed, of ${total} pages checked (sweep written ${coverage.writtenAt ?? "unknown"}).`;
}

// ─── Rendering ─────────────────────────────────────────────────────────────
const cell = (s, n = 70) =>
  String(s)
    .replace(/\|/g, "/")
    .replace(/[\r\n]+/g, " ")
    .slice(0, n);
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const num = (x) => Math.round(x).toLocaleString("en-US");
const pos = (x) => (x === null ? "-" : x.toFixed(1));
const signed = (x) => (x > 0 ? `+${num(x)}` : num(x));
const shortPage = (u) => u.replace(/^https?:\/\/[^/]+/, "") || "/";

function table(head, rows) {
  if (!rows.length) return "None.\n";
  return (
    [
      `| ${head.join(" | ")} |`,
      `| ${head.map(() => "---").join(" | ")} |`,
      ...rows.map((r) => `| ${r.join(" | ")} |`),
    ].join("\n") + "\n"
  );
}

export function renderSummary({
  site,
  lastFinal,
  ranges,
  now,
  before,
  report,
  verdict,
  coverage,
  previousTotals,
}) {
  const L = [`## Search results report`, ""];
  L.push(`Property ${site}. Final data up to ${lastFinal}.`, "");
  const d = verdict.days.map(
    (x) =>
      `${x.date}: ${num(x.impressions)} impressions against a baseline of ${num(x.baseline)}`,
  );
  L.push(
    verdict.alarm ? "### ALARM impressions" : "### Alarm check",
    "",
    verdict.alarm
      ? `Both of the 2 newest days are below ${T.alarmFraction * 100} percent of their weekday baseline (baseline at least ${T.alarmMinBaseline} a day). ${d.join("; ")}.`
      : `OK. ${verdict.enough ? d.join("; ") + "." : "Not enough history yet to compare."} The alarm needs both of the 2 newest days below ${T.alarmFraction * 100} percent of their weekday baseline, with a baseline of at least ${T.alarmMinBaseline} a day.`,
    "",
  );
  if (!report) {
    L.push("The full report runs on Mondays and on manual runs.", "");
    return L.join("\n") + "\n";
  }
  L.push(
    `### Site, last ${T.windowDays} days (${ranges.now[0]} to ${ranges.now[1]}) against the ${T.windowDays} before`,
    "",
  );
  L.push(
    table(
      ["", "Clicks", "Impressions", "Click rate", "Avg position"],
      [
        [
          "Now",
          num(now.clicks),
          num(now.impressions),
          pct(now.ctr),
          pos(now.position),
        ],
        [
          "Before",
          num(before.clicks),
          num(before.impressions),
          pct(before.ctr),
          pos(before.position),
        ],
        [
          "Change",
          signed(now.clicks - before.clicks),
          signed(now.impressions - before.impressions),
          `${((now.ctr - before.ctr) * 100).toFixed(1)} pts`,
          (now.position - before.position).toFixed(1),
        ],
      ],
    ),
  );
  if (previousTotals)
    L.push(
      `At the last stored report: ${num(previousTotals.clicks)} clicks and ${num(previousTotals.impressions)} impressions.`,
      "",
    );
  const withheldLine = `Search terms withheld: public repository (${report.queryCount} searches). They are shown only when SHOW_SEARCH_TERMS is "true".`;
  if (report.termsShown) {
    L.push(
      `### Top ${T.top} searches by clicks`,
      "",
      table(
        ["Search", "Clicks", "Change", "Impressions", "Position", "Pos change"],
        report.topQueries.map((r) => [
          cell(r.key),
          num(r.clicks),
          r.isNew ? "new" : signed(r.dClicks),
          num(r.impressions),
          pos(r.position),
          pos(r.dPosition),
        ]),
      ),
    );
  }
  L.push(
    `### Top ${T.top} pages by clicks`,
    "",
    table(
      ["Page", "Clicks", "Change", "Impressions", "Position", "Pos change"],
      report.topPages.map((r) => [
        cell(shortPage(r.key)),
        num(r.clicks),
        r.isNew ? "new" : signed(r.dClicks),
        num(r.impressions),
        pos(r.position),
        pos(r.dPosition),
      ]),
    ),
  );
  if (report.termsShown) {
    L.push(
      `### Biggest gainers (searches, by clicks)`,
      "",
      table(
        ["Search", "Clicks", "Change"],
        report.queryMovers.gainers.map((r) => [
          cell(r.key),
          num(r.clicks),
          signed(r.dClicks),
        ]),
      ),
    );
    L.push(
      `### Biggest losers (searches, by clicks)`,
      "",
      table(
        ["Search", "Clicks", "Change"],
        report.queryMovers.losers.map((r) => [
          cell(r.key),
          num(r.clicks),
          signed(r.dClicks),
        ]),
      ),
    );
    L.push(
      `### Cheapest wins: searches at position ${T.rankMinPos} to ${T.rankMaxPos} with at least ${T.rankMinImpressions} impressions`,
      "",
      table(
        ["Search", "Impressions", "Position", "Clicks"],
        report.cheapWins.map((r) => [
          cell(r.key),
          num(r.impressions),
          pos(r.position),
          num(r.clicks),
        ]),
      ),
    );
  } else {
    L.push(`### Searches`, "", withheldLine, "");
  }
  L.push(
    `### Seen but not clicked: pages with at least ${T.ctrMinImpressions} impressions and a click rate under ${T.ctrMax * 100} percent`,
    "",
    table(
      ["Page", "Impressions", "Click rate", "Position"],
      report.poorCtr.map((r) => [
        cell(shortPage(r.key)),
        num(r.impressions),
        pct(r.clicks / r.impressions),
        pos(r.position),
      ]),
    ),
  );
  const cov = coverageLine(coverage);
  if (cov) L.push(`### Coverage`, "", cov, "");
  L.push(
    `### Privacy`,
    "",
    report.termsShown
      ? `Withheld: ${report.withheldQueries} searches (fewer than ${T.minQueryImpressions} impressions in the period, an "@", or 7 or more digits) and ${report.withheldPages} pages. A personal name cannot be detected with certainty, so the ${T.minQueryImpressions} impression floor is the control. No key, token or address of a person is in this report.`
      : `No search term is printed or stored in this run (public repository rule). Withheld by the filter in any case: ${report.withheldQueries} searches and ${report.withheldPages} pages. No key, token or address of a person is in this report.`,
    "",
  );
  return L.join("\n") + "\n";
}

// ─── Search Console API ────────────────────────────────────────────────────
export function serviceAccount(json) {
  const sa = JSON.parse(json);
  sa.private_key = String(sa.private_key).replace(/\\n/g, "\n"); // some secret stores escape newlines
  return sa;
}

export class ApiError extends Error {}

/** Token exchange. On failure only the status number is kept, never the response text. */
export async function getAccessToken(
  sa,
  fetchImpl = fetch,
  nowSec = Math.floor(Date.now() / 1000),
) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const input = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: nowSec + 3600,
    iat: nowSec,
  })}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(input)
    .sign(sa.private_key)
    .toString("base64url");
  const body = `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(`${input}.${signature}`)}`;
  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new ApiError(`token exchange failed: HTTP ${res.status}`);
  return (await res.json()).access_token;
}

export function makeQuery(token, siteUrl, fetchImpl = fetch) {
  return async function query(body) {
    const res = await fetchImpl(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataState: "final", ...body }),
      },
    );
    if (!res.ok)
      throw new ApiError(`searchAnalytics.query failed: HTTP ${res.status}`);
    return (await res.json()).rows ?? [];
  };
}

// Rights, most to least. siteUnverifiedUser cannot read search data.
const RIGHTS = {
  siteOwner: 4,
  siteFullUser: 3,
  siteRestrictedUser: 2,
  siteUnverifiedUser: 0,
};

/**
 * entries: siteEntry rows from sites.list, { siteUrl, permissionLevel }.
 * Takes the domain property for `domain` if the account can read it, else the
 * address property for www or the bare host (https first) with the most
 * rights. Returns null when the account can read none of them.
 */
export function chooseProperty(entries, domain) {
  const readable = (entries ?? []).filter(
    (e) => (RIGHTS[e.permissionLevel] ?? 0) > 0,
  );
  const dom = `sc-domain:${domain}`;
  if (readable.some((e) => e.siteUrl === dom)) return dom;
  const order = [
    `https://www.${domain}/`,
    `https://${domain}/`,
    `http://www.${domain}/`,
    `http://${domain}/`,
  ];
  const best = readable
    .filter((e) => order.includes(e.siteUrl))
    .sort(
      (a, b) =>
        RIGHTS[b.permissionLevel] - RIGHTS[a.permissionLevel] ||
        order.indexOf(a.siteUrl) - order.indexOf(b.siteUrl),
    )[0];
  return best?.siteUrl ?? null;
}

/** One GET: the properties this service account can see. Status number only on failure. */
export async function listProperties(token, fetchImpl = fetch) {
  const res = await fetchImpl(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new ApiError(`sites.list failed: HTTP ${res.status}`);
  return (await res.json()).siteEntry ?? [];
}

/** Search terms are shown only when SHOW_SEARCH_TERMS is exactly "true". */
export const showTermsFrom = (env) => env.SHOW_SEARCH_TERMS === "true";

export const NOT_CONFIGURED =
  "Search results report: not configured (secret GSC_SERVICE_ACCOUNT_JSON is missing)";

const asRow = (r) => ({
  key: r.keys[0],
  clicks: r.clicks ?? 0,
  impressions: r.impressions ?? 0,
  position: r.position ?? 0,
});

/**
 * The whole run, with the API behind `query`. Returns { summary, json, exitCode }.
 * today is "YYYY-MM-DD" (UTC).
 */
export async function buildReport({
  query,
  site,
  today,
  withReport,
  coverage = null,
  previous = null,
  showTerms = false,
  now = new Date(),
}) {
  const series = (
    await query({
      startDate: addDays(today, -70),
      endDate: today,
      dimensions: ["date"],
      rowLimit: 100,
    })
  ).map((r) => ({
    date: r.keys[0],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    position: r.position ?? 0,
  }));
  if (!series.length)
    throw new ApiError(
      "no data returned for the property (is the service account added to it?)",
    );
  const boundary = addDays(today, -T.finalLagDays);
  const verdict = alarm(series, boundary);
  const newestRow = series
    .map((r) => r.date)
    .sort()
    .at(-1);
  const lastFinal = newestRow > boundary ? newestRow : boundary;
  const ranges = {
    now: [addDays(lastFinal, -(T.windowDays - 1)), lastFinal],
    before: [
      addDays(lastFinal, -(2 * T.windowDays - 1)),
      addDays(lastFinal, -T.windowDays),
    ],
  };
  const inRange = ([a, b]) => series.filter((r) => r.date >= a && r.date <= b);
  const nowTotals = totals(inRange(ranges.now));
  const beforeTotals = totals(inRange(ranges.before));

  let report = null;
  if (withReport) {
    // Rows come sorted by clicks, so a property with more than one page of
    // them needs every page before the lists are worked out.
    const q = async (dimension, [startDate, endDate]) => {
      const all = [];
      for (let page = 0; page < T.maxPages; page += 1) {
        const rows = await query({
          startDate,
          endDate,
          dimensions: [dimension],
          rowLimit: T.pageRows,
          startRow: page * T.pageRows,
        });
        all.push(...rows);
        if (rows.length < T.pageRows) break;
      }
      return all.map(asRow);
    };
    const [nowQueries, beforeQueries, nowPages, beforePages] =
      await Promise.all([
        q("query", ranges.now),
        q("query", ranges.before),
        q("page", ranges.now),
        q("page", ranges.before),
      ]);
    report = shapeReport({
      nowQueries,
      beforeQueries,
      nowPages,
      beforePages,
      showTerms,
    });
  }

  const summary = renderSummary({
    site,
    lastFinal,
    ranges,
    now: nowTotals,
    before: beforeTotals,
    report,
    verdict,
    coverage,
    previousTotals: previous?.totals?.now ?? null,
  });
  const json = {
    generatedAt: now.toISOString(),
    site,
    lastFinal,
    ranges,
    totals: { now: nowTotals, before: beforeTotals },
    alarm: { fired: verdict.alarm, days: verdict.days },
    ...(report
      ? {
          ...(report.termsShown
            ? {
                topQueries: report.topQueries.map(
                  ({ key, clicks, impressions, position }) => ({
                    key,
                    clicks,
                    impressions,
                    position,
                  }),
                ),
                cheapWins: report.cheapWins.map(
                  ({ key, impressions, position }) => ({
                    key,
                    impressions,
                    position,
                  }),
                ),
              }
            : { searchTermsWithheld: report.queryCount }),
          topPages: report.topPages.map(
            ({ key, clicks, impressions, position }) => ({
              key,
              clicks,
              impressions,
              position,
            }),
          ),
          withheld: {
            queries: report.withheldQueries,
            pages: report.withheldPages,
          },
        }
      : {}),
  };
  return {
    summary,
    json,
    exitCode: verdict.alarm ? 1 : 0,
    alarmLine: verdict.alarm
      ? `ALARM impressions: ${verdict.days.map((d) => `${d.date} ${Math.round(d.impressions)} against baseline ${Math.round(d.baseline)}`).join(", ")}`
      : null,
  };
}

// ─── CLI ───────────────────────────────────────────────────────────────────
function arg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const readJson = (file) =>
  file && existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;

async function main() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    // Not an error: the owner step that adds the secret has not happened yet.
    // No file is written. This is not proof that the report works.
    console.log(`::notice::${NOT_CONFIGURED}`);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `## Search results report\n\n${NOT_CONFIGURED}\n`,
      );
    process.exit(0);
  }
  const domain = (process.env.GSC_DOMAIN || "").trim();
  let site = (process.env.GSC_SITE_URL || "").trim();
  if (!site && !domain)
    throw new ApiError("GSC_DOMAIN or GSC_SITE_URL must be set");
  const token = await getAccessToken(serviceAccount(raw));
  if (!site) {
    site = chooseProperty(await listProperties(token), domain);
    if (!site) {
      throw new ApiError(
        `the service account cannot read a property for ${domain} (see OPS-25 step 2)`,
      );
    }
  }
  const result = await buildReport({
    query: makeQuery(token, site),
    site,
    today: new Date().toISOString().slice(0, 10),
    withReport: process.argv.includes("--report"),
    coverage: readJson(arg("coverage")),
    previous: readJson(arg("previous")),
    showTerms: showTermsFrom(process.env),
  });
  writeFileSync(
    arg("out", "search-report.json"),
    JSON.stringify(result.json, null, 2),
  );
  console.log(result.summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary);
  if (result.alarmLine) console.log(result.alarmLine);
  process.exit(result.exitCode);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    // Only our own messages (a status number) are printed, never a response body or the key.
    console.error(
      `::error::search report failed: ${e instanceof ApiError ? e.message : "unexpected error"}`,
    );
    process.exit(2);
  });
}
