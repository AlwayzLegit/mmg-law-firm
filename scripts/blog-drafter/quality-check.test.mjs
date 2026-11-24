import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALLOWED_FIELDS, buildPayload, validate } from "./draft.mjs";
import { DESK_POINTS, MECHANICAL_POINTS, REQUIRED_POINTS, checkDesk, checkLinks, checkMechanics, formatLine, linksOf, runCheck, summaryLine } from "./quality-check.mjs";

const read = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8"));
const brief = read("./fixtures/brief.json").brief;
const sample = () => read("./sample-post.json");
const failing = () => read("./fixtures/failing-draft.json");
const okFetch = async () => ({ status: 200 });
const byPoint = (checks, point) => checks.find((c) => c.point === point);
const run = (post, opts = {}) => runCheck(post, { brief, problems: validate(post, brief), fetchFn: okFetch, ...opts });

test("there are 17 points: six for the desk, eleven measured", () => {
  assert.equal(DESK_POINTS.length, 6);
  assert.equal(MECHANICAL_POINTS.length, 11);
  assert.equal(new Set(REQUIRED_POINTS).size, 17);
});

test("the sample passes all 17 points, in order", async () => {
  const r = await run(sample());
  assert.deepEqual(r.checks.filter((c) => !c.pass), []);
  assert.equal(summaryLine(r), "check: 17 of 17 pass");
  assert.deepEqual(r.checks.map((c) => c.point), REQUIRED_POINTS);
});

test("the failing draft fails only markdown, naming deadlines, how-a-lawyer-helps and cta", async () => {
  const r = await run(failing());
  const failed = r.checks.filter((c) => !c.pass);
  assert.deepEqual(failed.map((c) => c.point), ["markdown"]);
  for (const key of ["deadlines", "how-a-lawyer-helps", "cta"]) assert.match(failed[0].saw, new RegExp(`missing required H2 section: ${key}`));
  assert.match(formatLine(failed[0]), /^markdown: FAIL: /);
});

test("the desk field never reaches the API payload", () => {
  assert.ok(!ALLOWED_FIELDS.includes("desk"));
  assert.ok(!("desk" in buildPayload(sample(), "run-1")));
  assert.deepEqual(validate(sample(), brief), []);
});

test("desk: a missing, empty or malformed verdict fails that point", () => {
  assert.equal(checkDesk(undefined).filter((c) => !c.pass).length, 6);
  const d = sample().desk;
  assert.equal(checkDesk({ ...d, need: { pass: true, saw: "  " } }).find((c) => c.point === "need").pass, false);
  assert.equal(checkDesk({ ...d, new: { pass: "yes", saw: "x" } }).find((c) => c.point === "new").pass, false);
  assert.equal(checkDesk({ ...d, true: { pass: false, saw: "a claim not found" } }).find((c) => c.point === "true").pass, false);
  assert.equal(checkDesk(d).every((c) => c.pass), true);
});

const mech = (change, point) => {
  const post = { ...sample(), ...change };
  return byPoint(checkMechanics({ post, brief, problems: validate(post, brief) }), point);
};

test("each measured point passes once and fails once", () => {
  assert.equal(mech({}, "title_meta").pass, true);
  assert.equal(mech({ title: "x".repeat(61) }, "title_meta").pass, false);
  assert.equal(mech({ meta_description: "short" }, "title_meta").pass, false);
  assert.equal(mech({ body_md: `# A heading\n\n${sample().body_md}` }, "one_h1").pass, false);
  assert.equal(mech({ primary_keyword: "something else" }, "target_in_title_and_first_100_words").pass, false);
  assert.equal(mech({ primary_keyword: "" }, "target_in_title_and_first_100_words").pass, false);
  assert.equal(mech({ body_md: sample().body_md.replace(/\(\/blog\)/g, "(/blog)").replace("(/locations)", "(/not-in-site-urls)") }, "internal_links").pass, false);
  assert.equal(mech({ body_md: sample().body_md.replace(/\(\/contact\)/g, "(/blog)") }, "contact_link").pass, false);
  assert.equal(mech({ body_md: sample().body_md.replace(/\*\*[^*\n]+\?\*\*/g, "**Not a question**") }, "faq").pass, false);
  assert.equal(mech({ hero_image_url: "https://example.org/x.png", hero_image_alt: "short" }, "image_alt").pass, false);
  assert.equal(mech({ hero_image_url: "https://example.org/x.png", hero_image_alt: "A clear description of the image" }, "image_alt").pass, true);
  assert.equal(mech({ title: "Sample – drafting workflow dry run" }, "no_dashes").pass, false);
  assert.equal(mech({ body_md: `${sample().body_md}\n\n<div>raw</div>` }, "markdown").pass, false);
  assert.equal(mech({ body_md: `${sample().body_md}\n\n#### Skipped a level\n\nx` }, "markdown").pass, false);
});

test("external links: only https .gov sources pass, a firm or directory fails", () => {
  const withLink = (href) => ({ body_md: `${sample().body_md}\n\nSee [a source](${href}).` });
  assert.equal(mech(withLink("https://www.dmv.ca.gov/portal/"), "no_competitor_links").pass, true);
  assert.equal(mech(withLink("https://www.example-injury-law.com/"), "no_competitor_links").pass, false);
  assert.equal(mech(withLink("https://www.justia.com/x"), "no_competitor_links").pass, false);
  assert.equal(mech(withLink("http://www.dmv.ca.gov/"), "no_competitor_links").pass, false);
});

test("linksOf leaves images out", () => {
  assert.deepEqual(linksOf("![x](/img.png) [a](/contact) [b](https://x.gov/y \"t\")"), ["/contact", "https://x.gov/y"]);
});

test("links_200: a 404, a thrown error, a HEAD-only refusal, and the offline line", async () => {
  const text = "[a](/contact) [b](https://www.dmv.ca.gov/x)";
  const seen = [];
  const f = async (url, init) => {
    seen.push(`${init.method} ${url}`);
    if (url.endsWith("/contact")) return { status: init.method === "HEAD" ? 405 : 200 };
    return { status: 404 };
  };
  const r = await checkLinks({ text, site: "https://www.mmg-lawfirm.com", fetchFn: f });
  assert.equal(r.pass, false);
  assert.match(r.saw, /dmv\.ca\.gov\/x answered 404/);
  assert.doesNotMatch(r.saw, /\/contact answered/);
  assert.ok(seen.includes("GET https://www.mmg-lawfirm.com/contact"));
  const t = await checkLinks({ text: "[a](/contact)", fetchFn: async () => { throw new Error("down"); } });
  assert.match(t.saw, /answered no answer/);
  const calls = [];
  const o = await checkLinks({ text, offline: true, fetchFn: async (u) => { calls.push(u); return { status: 200 }; } });
  assert.equal(o.pass, true);
  assert.deepEqual(calls, []);
  assert.match(o.saw, /offline: 2 distinct links are well formed, none fetched/);
});
