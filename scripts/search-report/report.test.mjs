// Run with: node --test scripts/search-report/report.test.mjs
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ApiError,
  NOT_CONFIGURED,
  T,
  addDays,
  alarm,
  buildReport,
  chooseProperty,
  compare,
  coverageLine,
  filterPages,
  filterQueries,
  getAccessToken,
  listProperties,
  looksPersonal,
  makeQuery,
  serviceAccount,
  shapeReport,
  showTermsFrom,
  totals,
} from "./report.mjs";

// 45 days ending 2026-11-12, one flat level, with the last two days overridden.
function series(
  level,
  lastTwo = [level, level],
  days = 45,
  last = "2026-11-12",
) {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(last, -(days - 1 - i));
    const impressions =
      i === days - 1 ? lastTwo[1] : i === days - 2 ? lastTwo[0] : level;
    return { date, impressions };
  });
}

test("the alarm fires when both newest days are at 29 percent of their baseline", () => {
  const v = alarm(series(1000, [290, 290]));
  assert.equal(v.alarm, true);
  assert.deepEqual(
    v.days.map((d) => d.baseline),
    [1000, 1000],
  );
});

test("the alarm does not fire at exactly 30 percent, or when only one day is low", () => {
  assert.equal(alarm(series(1000, [300, 300])).alarm, false);
  assert.equal(alarm(series(1000, [900, 100])).alarm, false);
  assert.equal(alarm(series(1000, [100, 900])).alarm, false);
});

test("the alarm does not fire when the baseline is under 100 impressions a day", () => {
  assert.equal(alarm(series(99, [0, 0])).alarm, false);
  assert.equal(alarm(series(100, [0, 0])).alarm, true);
});

test("the alarm needs 4 weeks of history and compares the same weekday", () => {
  assert.equal(alarm(series(1000, [0, 0], 20)).alarm, false);
  assert.equal(alarm(series(1000, [0, 0], 20)).enough, false);
  // A weekly pattern: weekends low. Two low weekend days against low weekend baselines are fine.
  const weekly = series(1000, [1000, 1000]).map((r) => ({
    ...r,
    impressions: [0, 6].includes(new Date(`${r.date}T00:00:00Z`).getUTCDay())
      ? 200
      : 1000,
  }));
  assert.equal(alarm(weekly).alarm, false);
});

test("days Search Console leaves out count as zero impressions", () => {
  const rows = series(1000).slice(0, -2); // the 2 newest days are missing, so the newest present day is the 3rd newest
  assert.equal(alarm(rows).alarm, false);
  assert.equal(alarm([]).alarm, false);
});

test("a total drop to zero fires the alarm when the newest day that should exist is given", () => {
  // Search Console leaves out the 2 zero days, so the last row is 2 days older.
  const rows = series(1000).slice(0, -2);
  assert.equal(alarm(rows).alarm, false); // no boundary: the old blind spot
  const v = alarm(rows, "2026-11-12");
  assert.equal(v.alarm, true);
  assert.deepEqual(
    v.days.map((d) => [d.date, d.impressions]),
    [
      ["2026-11-11", 0],
      ["2026-11-12", 0],
    ],
  );
  // One missing day only (data not final yet) never fires: both days must be low.
  assert.equal(alarm(series(1000).slice(0, -1), "2026-11-12").alarm, false);
  // A boundary older than the newest row changes nothing.
  assert.equal(alarm(series(1000, [290, 290]), "2026-11-01").alarm, true);
});

test("every page of query and page rows is read before the lists are worked out", async () => {
  const seen = [];
  const query = async (body) => {
    if (body.dimensions[0] === "date") {
      return series(1000, [1000, 1000], 71, "2026-11-12").map((r) => ({
        keys: [r.date],
        clicks: 1,
        impressions: r.impressions,
        position: 8,
      }));
    }
    seen.push(body.startRow);
    const total = 1500;
    const from = body.startRow ?? 0;
    const n = Math.max(0, Math.min(body.rowLimit, total - from));
    return Array.from({ length: n }, (_, i) => ({
      keys: [`${body.dimensions[0]} ${from + i}`],
      clicks: 1,
      impressions: 100,
      position: 9,
    }));
  };
  await buildReport({
    query,
    site: "s",
    today: "2026-11-14",
    withReport: true,
  });
  assert.ok(seen.includes(0) && seen.includes(1000));
  assert.ok(!seen.includes(2000));
});

test("the privacy filter drops an email, a phone number and a 5 impression term", () => {
  const rows = [
    {
      key: "car accident lawyer glendale",
      impressions: 500,
      clicks: 5,
      position: 4,
    },
    { key: "jane.doe@example.com", impressions: 500, clicks: 1, position: 2 },
    { key: "call 310 555 0188", impressions: 500, clicks: 1, position: 2 },
    { key: "rare term", impressions: 5, clicks: 0, position: 9 },
    {
      key: "2021 car accident lawyer",
      impressions: 20,
      clicks: 0,
      position: 9,
    },
  ];
  const { kept, withheld } = filterQueries(rows);
  assert.deepEqual(
    kept.map((r) => r.key),
    ["car accident lawyer glendale", "2021 car accident lawyer"],
  );
  assert.equal(withheld, 3);
  assert.equal(looksPersonal("order 1234567"), true);
  assert.equal(looksPersonal("order 123456"), false);
  assert.deepEqual(
    filterPages([
      { key: "https://mmg-lawfirm.com/a@b.co" },
      { key: "https://mmg-lawfirm.com/strain/blue-dream" },
    ]).kept.length,
    1,
  );
});

test("compare handles a page that is new this period", () => {
  const out = compare(
    [
      { key: "/new", clicks: 7, impressions: 90, position: 8 },
      { key: "/old", clicks: 4, impressions: 80, position: 6 },
    ],
    [{ key: "/old", clicks: 10, impressions: 100, position: 5 }],
  );
  const byKey = Object.fromEntries(out.map((r) => [r.key, r]));
  assert.deepEqual(
    [byKey["/new"].isNew, byKey["/new"].dClicks, byKey["/new"].dPosition],
    [true, 7, null],
  );
  assert.deepEqual(
    [byKey["/old"].isNew, byKey["/old"].dClicks, byKey["/old"].dPosition],
    [false, -6, 1],
  );
});

test("totals weigh the average position by impressions", () => {
  const t = totals([
    { clicks: 10, impressions: 100, position: 2 },
    { clicks: 0, impressions: 300, position: 10 },
  ]);
  assert.deepEqual(
    [t.clicks, t.impressions, t.ctr, t.position],
    [10, 400, 0.025, 8],
  );
});

test("the report picks cheap wins at position 5 to 20 and pages seen but not clicked", () => {
  const q = (key, impressions, position, clicks = 1) => ({
    key,
    impressions,
    position,
    clicks,
  });
  const r = shapeReport({
    showTerms: true,
    nowQueries: [
      q("a", 900, 12),
      q("b", 900, 3),
      q("c", 40, 12),
      q("d", 700, 25),
      q("e", 300, 5),
    ],
    beforeQueries: [],
    nowPages: [
      {
        key: "https://mmg-lawfirm.com/x",
        impressions: 2000,
        clicks: 5,
        position: 9,
      },
      {
        key: "https://mmg-lawfirm.com/y",
        impressions: 2000,
        clicks: 100,
        position: 3,
      },
      {
        key: "https://mmg-lawfirm.com/z",
        impressions: 100,
        clicks: 0,
        position: 3,
      },
    ],
    beforePages: [],
  });
  assert.deepEqual(
    r.cheapWins.map((x) => x.key),
    ["a", "e"],
  );
  assert.deepEqual(
    r.poorCtr.map((x) => x.key),
    ["https://mmg-lawfirm.com/x"],
  );
});

test("coverage line: indexed against not indexed, or no line at all without a coverage file", () => {
  assert.equal(coverageLine(null), null);
  const line = coverageLine({
    writtenAt: "2026-11-09T07:40:00Z",
    counts: {
      "Submitted and indexed": 80,
      "Crawled - currently not indexed": 15,
      "Discovered - currently not indexed": 5,
    },
  });
  assert.match(line, /80 indexed, 20 not indexed, of 100 pages/);
});

// ─── The whole run with a fake Search Console ────────────────────────────────
const { privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const KEY_PEM = privateKey.export({ type: "pkcs8", format: "pem" });
const SECRET_MARKER = "BEGIN PRIVATE KEY";

function fakeApi({
  level = 1000,
  lastTwo = [level, level],
  tokenStatus = 200,
} = {}) {
  const calls = [];
  const rows = series(level, lastTwo, 71, "2026-11-12");
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), body: init?.body });
    if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
      return tokenStatus === 200
        ? Response.json({ access_token: "tok" })
        : new Response(`denied: ${KEY_PEM}`, { status: tokenStatus });
    }
    const body = JSON.parse(init.body);
    if (body.dimensions[0] === "date") {
      return Response.json({
        rows: rows.map((r) => ({
          keys: [r.date],
          clicks: r.impressions / 50,
          impressions: r.impressions,
          position: 8,
        })),
      });
    }
    const keys =
      body.dimensions[0] === "query"
        ? [
            "car accident lawyer glendale",
            "jane@example.com",
            "motorcycle accident attorney",
          ]
        : [
            "https://mmg-lawfirm.com/",
            "https://mmg-lawfirm.com/practice-areas",
          ];
    return Response.json({
      rows: keys.map((k, i) => ({
        keys: [k],
        clicks: 10 - i,
        impressions: 600 - i * 10,
        position: 7 + i,
      })),
    });
  };
  return { fetchImpl, calls };
}

test("a full report run shows totals, the top searches and the position 5 to 20 list, with no key and no personal data", async () => {
  const api = fakeApi();
  const sa = serviceAccount(
    JSON.stringify({
      client_email: "reader@example.iam.gserviceaccount.com",
      private_key: KEY_PEM,
    }),
  );
  const token = await getAccessToken(sa, api.fetchImpl);
  const result = await buildReport({
    query: makeQuery(token, "sc-domain:mmg-lawfirm.com", api.fetchImpl),
    site: "sc-domain:mmg-lawfirm.com",
    today: "2026-11-14",
    withReport: true,
    showTerms: true,
  });
  assert.equal(result.exitCode, 0);
  for (const heading of [
    "### Alarm check",
    "### Site, last 28 days",
    "### Top 20 searches",
    "### Cheapest wins",
    "### Seen but not clicked",
  ]) {
    assert.ok(result.summary.includes(heading), heading);
  }
  assert.match(result.summary, /car accident lawyer glendale/);
  assert.ok(
    !result.summary.includes("### Coverage"),
    "no coverage section without a file",
  );
  assert.ok(!result.summary.includes("waiting for the next coverage sweep"));
  const out = result.summary + JSON.stringify(result.json);
  assert.ok(!out.includes("jane@example.com"), "no email");
  assert.ok(!out.includes(SECRET_MARKER), "no private key");
  assert.ok(
    !out.includes("Bearer") && !out.includes("access_token"),
    "no token",
  );
  assert.ok(!out.includes("reader@example.iam"), "no service account address");
  // Read only scope, final data only.
  assert.ok(
    api.calls.some(
      (c) =>
        c.url.includes("oauth2") &&
        decodeURIComponent(c.body).includes("assertion="),
    ),
  );
  const assertion = decodeURIComponent(api.calls[0].body).split(
    "assertion=",
  )[1];
  const claims = JSON.parse(
    Buffer.from(assertion.split(".")[1], "base64url").toString(),
  );
  assert.equal(
    claims.scope,
    "https://www.googleapis.com/auth/webmasters.readonly",
  );
  assert.ok(
    api.calls.slice(1).every((c) => JSON.parse(c.body).dataState === "final"),
  );
});

test("a run without --report makes one API call and prints the alarm check only", async () => {
  const api = fakeApi();
  const result = await buildReport({
    query: makeQuery("tok", "sc-domain:mmg-lawfirm.com", api.fetchImpl),
    site: "s",
    today: "2026-11-14",
    withReport: false,
  });
  assert.equal(api.calls.length, 1);
  assert.match(result.summary, /### Alarm check/);
  assert.ok(!result.summary.includes("### Top 20"));
});

test("a drop to 29 percent on both newest days exits 1 with ALARM impressions", async () => {
  const api = fakeApi({ lastTwo: [290, 290] });
  const result = await buildReport({
    query: makeQuery("tok", "s", api.fetchImpl),
    site: "s",
    today: "2026-11-14",
    withReport: false,
  });
  assert.equal(result.exitCode, 1);
  assert.match(
    result.alarmLine,
    /^ALARM impressions: 2026-11-11 290 against baseline 1000, 2026-11-12 290 against baseline 1000$/,
  );
  assert.match(result.summary, /### ALARM impressions/);
});

test("a failed token exchange reports the status number only, never the response", async () => {
  const api = fakeApi({ tokenStatus: 401 });
  const sa = serviceAccount(
    JSON.stringify({ client_email: "x", private_key: KEY_PEM }),
  );
  await assert.rejects(
    () => getAccessToken(sa, api.fetchImpl),
    (e) =>
      e instanceof ApiError &&
      e.message === "token exchange failed: HTTP 401" &&
      !e.message.includes("denied"),
  );
});

test("a property with no data fails clearly", async () => {
  await assert.rejects(
    () =>
      buildReport({
        query: async () => [],
        site: "s",
        today: "2026-11-14",
        withReport: false,
      }),
    /no data returned/,
  );
});

test("thresholds are the documented ones", () => {
  assert.deepEqual(
    [T.alarmFraction, T.alarmMinBaseline, T.minQueryImpressions, T.windowDays],
    [0.3, 100, 20, 28],
  );
});

// ─── The five changes for MMG Law (OPS-37) ──────────────────────────────────

const NAME_QUERY = "john q smith insurance claim glendale";

/** A fake Search Console whose searches include a person's name. */
function namedApi() {
  const calls = [];
  const rows = series(1000, [1000, 1000], 71, "2026-11-12");
  const fetchImpl = async (url, init) => {
    calls.push(String(url));
    const body = JSON.parse(init.body);
    if (body.dimensions[0] === "date") {
      return Response.json({
        rows: rows.map((r) => ({
          keys: [r.date],
          clicks: r.impressions / 50,
          impressions: r.impressions,
          position: 8,
        })),
      });
    }
    const keys =
      body.dimensions[0] === "query"
        ? [NAME_QUERY, "car accident lawyer glendale"]
        : [
            "https://www.mmg-lawfirm.com/",
            "https://www.mmg-lawfirm.com/contact",
          ];
    return Response.json({
      rows: keys.map((k, i) => ({
        keys: [k],
        clicks: 10 - i,
        impressions: 600 - i * 10,
        position: 7 + i,
      })),
    });
  };
  return { fetchImpl, calls };
}

test("search terms are shown only when SHOW_SEARCH_TERMS is exactly true", () => {
  assert.equal(showTermsFrom({}), false);
  for (const v of ["", "false", "TRUE", "True", "1", "yes", " true", "true "]) {
    assert.equal(
      showTermsFrom({ SHOW_SEARCH_TERMS: v }),
      false,
      JSON.stringify(v),
    );
  }
  assert.equal(showTermsFrom({ SHOW_SEARCH_TERMS: "true" }), true);
});

test("with terms withheld (the default) a person's name is in no summary line and no JSON", async () => {
  for (const showTerms of [undefined, false, "true", "yes", 1]) {
    const api = namedApi();
    const result = await buildReport({
      query: makeQuery("tok", "sc-domain:mmg-lawfirm.com", api.fetchImpl),
      site: "sc-domain:mmg-lawfirm.com",
      today: "2026-11-14",
      withReport: true,
      ...(showTerms === undefined ? {} : { showTerms }),
    });
    const out = result.summary + JSON.stringify(result.json);
    assert.ok(
      !out.includes("smith"),
      `no name, showTerms=${String(showTerms)}`,
    );
    assert.ok(!out.includes("car accident lawyer"), "no search term at all");
    assert.ok(!out.includes("### Top 20 searches"));
    assert.ok(!out.includes("### Cheapest wins"));
    assert.ok(!out.includes("### Biggest gainers"));
    assert.ok(!out.includes("### Biggest losers"));
    assert.match(
      result.summary,
      /Search terms withheld: public repository \(2 searches\)/,
    );
    assert.equal("topQueries" in result.json, false);
    assert.equal("cheapWins" in result.json, false);
    assert.equal(result.json.searchTermsWithheld, 2);
    // Totals and the site's own pages stay.
    assert.match(result.summary, /### Site, last 28 days/);
    assert.match(result.summary, /### Top 20 pages by clicks/);
    assert.match(result.summary, /\/contact/);
    assert.ok(result.json.totals.now.impressions > 0);
    assert.ok(result.json.topPages.length > 0);
  }
});

test("with showTerms true the same run does show the searches", async () => {
  const api = namedApi();
  const result = await buildReport({
    query: makeQuery("tok", "s", api.fetchImpl),
    site: "s",
    today: "2026-11-14",
    withReport: true,
    showTerms: true,
  });
  assert.ok(result.summary.includes("car accident lawyer glendale"));
  assert.ok(result.json.topQueries.length > 0);
});

test("the alarm line holds numbers only, withheld or not", async () => {
  const rows = series(1000, [290, 290], 71, "2026-11-12");
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    return Response.json({
      rows:
        body.dimensions[0] === "date"
          ? rows.map((r) => ({
              keys: [r.date],
              clicks: 1,
              impressions: r.impressions,
              position: 8,
            }))
          : body.dimensions[0] === "query"
            ? [{ keys: [NAME_QUERY], clicks: 5, impressions: 400, position: 9 }]
            : [
                {
                  keys: ["https://www.mmg-lawfirm.com/"],
                  clicks: 5,
                  impressions: 400,
                  position: 9,
                },
              ],
    });
  };
  const result = await buildReport({
    query: makeQuery("tok", "s", fetchImpl),
    site: "s",
    today: "2026-11-14",
    withReport: true,
  });
  assert.equal(result.exitCode, 1);
  assert.ok(!result.alarmLine.includes("smith"));
  assert.ok(!result.summary.includes("smith"));
});

test("property choice: the domain property first, else www or bare address with the most rights", () => {
  const e = (siteUrl, permissionLevel) => ({ siteUrl, permissionLevel });
  assert.equal(
    chooseProperty(
      [
        e("https://www.mmg-lawfirm.com/", "siteOwner"),
        e("sc-domain:mmg-lawfirm.com", "siteFullUser"),
      ],
      "mmg-lawfirm.com",
    ),
    "sc-domain:mmg-lawfirm.com",
  );
  assert.equal(
    chooseProperty(
      [
        e("https://mmg-lawfirm.com/", "siteRestrictedUser"),
        e("https://www.mmg-lawfirm.com/", "siteFullUser"),
      ],
      "mmg-lawfirm.com",
    ),
    "https://www.mmg-lawfirm.com/",
  );
  assert.equal(
    chooseProperty(
      [
        e("https://mmg-lawfirm.com/", "siteOwner"),
        e("https://www.mmg-lawfirm.com/", "siteFullUser"),
      ],
      "mmg-lawfirm.com",
    ),
    "https://mmg-lawfirm.com/",
  );
  // Same rights: https www before https bare.
  assert.equal(
    chooseProperty(
      [
        e("https://mmg-lawfirm.com/", "siteFullUser"),
        e("https://www.mmg-lawfirm.com/", "siteFullUser"),
      ],
      "mmg-lawfirm.com",
    ),
    "https://www.mmg-lawfirm.com/",
  );
});

test("property choice: nothing readable for the domain gives null, never another site", () => {
  const e = (siteUrl, permissionLevel) => ({ siteUrl, permissionLevel });
  assert.equal(chooseProperty([], "mmg-lawfirm.com"), null);
  assert.equal(chooseProperty(undefined, "mmg-lawfirm.com"), null);
  assert.equal(
    chooseProperty(
      [
        e("sc-domain:weedtip.com", "siteOwner"),
        e("https://www.mmg-lawfirm.com.evil.example/", "siteOwner"),
      ],
      "mmg-lawfirm.com",
    ),
    null,
  );
  // An unverified entry cannot read data.
  assert.equal(
    chooseProperty(
      [e("sc-domain:mmg-lawfirm.com", "siteUnverifiedUser")],
      "mmg-lawfirm.com",
    ),
    null,
  );
});

test("listProperties makes one GET with the token and reports the status number only", async () => {
  const seen = [];
  const ok = async (url, init) => {
    seen.push([
      String(url),
      init?.method ?? "GET",
      init?.headers?.Authorization,
    ]);
    return Response.json({
      siteEntry: [
        {
          siteUrl: "sc-domain:mmg-lawfirm.com",
          permissionLevel: "siteFullUser",
        },
      ],
    });
  };
  const list = await listProperties("tok", ok);
  assert.equal(list.length, 1);
  assert.deepEqual(seen, [
    ["https://www.googleapis.com/webmasters/v3/sites", "GET", "Bearer tok"],
  ]);
  assert.deepEqual(
    await listProperties("tok", async () => Response.json({})),
    [],
  );
  await assert.rejects(
    () =>
      listProperties(
        "tok",
        async () => new Response("secret body", { status: 403 }),
      ),
    (err) =>
      err instanceof ApiError && err.message === "sites.list failed: HTTP 403",
  );
});

test("with no secret the script prints the not configured line, writes no file and exits 0", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), "search-report-"));
  const env = { ...process.env, GSC_DOMAIN: "mmg-lawfirm.com" };
  delete env.GSC_SERVICE_ACCOUNT_JSON;
  delete env.GITHUB_STEP_SUMMARY;
  const run = spawnSync(
    process.execPath,
    [path.join(here, "report.mjs"), "--report"],
    {
      cwd: dir,
      env,
      encoding: "utf8",
    },
  );
  assert.equal(run.status, 0);
  assert.ok(run.stdout.includes(NOT_CONFIGURED));
  assert.equal(
    NOT_CONFIGURED,
    "Search results report: not configured (secret GSC_SERVICE_ACCOUNT_JSON is missing)",
  );
  assert.equal(run.stdout.trim().split("\n").length, 1, "one line");
  assert.equal(existsSync(path.join(dir, "search-report.json")), false);
});

test("a configured run with neither GSC_DOMAIN nor GSC_SITE_URL fails clearly before any call to Google", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(path.join(tmpdir(), "search-report-"));
  const env = {
    ...process.env,
    GSC_SERVICE_ACCOUNT_JSON:
      "not even json: the run must stop before reading it",
  };
  delete env.GSC_DOMAIN;
  delete env.GSC_SITE_URL;
  const run = spawnSync(process.execPath, [path.join(here, "report.mjs")], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  assert.equal(run.status, 2);
  assert.match(
    run.stderr,
    /search report failed: GSC_DOMAIN or GSC_SITE_URL must be set/,
  );
  assert.equal(existsSync(path.join(dir, "search-report.json")), false);
});
