import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALLOWED_FIELDS, CAP, WINDOW_DAYS, buildPayload, capCheck, capLine, internalLinks, validate } from "./draft.mjs";

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const brief = read("./fixtures/brief.json").brief;
const sample = () => read("./sample-post.json");
const NOW = new Date("2026-11-13T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const made = (daysAgo, extra = {}) => ({ created_at: new Date(NOW.getTime() - daysAgo * DAY).toISOString(), ...extra });

test("the cap constants are fixed", () => {
  assert.equal(CAP, 3);
  assert.equal(WINDOW_DAYS, 7);
});

test("cap: 2 allowed, 3 refused, every status counts", () => {
  assert.equal(capCheck([made(1), made(2)], NOW).allowed, true);
  const r = capCheck([made(1, { is_published: false }), made(3, { is_published: true }), made(6, { review_status: "rejected" })], NOW);
  assert.equal(r.allowed, false);
  assert.equal(r.nextSlotAt.getTime(), NOW.getTime() + 1 * DAY);
  assert.match(capLine(r), /cap: 3 of 3 filed in the last 7 days, next slot opens/);
});

test("cap: the 7-day edge is outside, rows without a date are ignored", () => {
  assert.equal(capCheck([made(7), made(1), made(2)], NOW).count, 2);
  assert.equal(capCheck([made(6.9), made(1), made(2)], NOW).count, 3);
  assert.equal(capCheck([{}, made(1)], NOW).count, 1);
});

test("the sample passes validate", () => {
  assert.deepEqual(validate(sample(), brief), []);
});

const bad = (change, pattern, b = brief) => {
  const problems = validate({ ...sample(), ...change }, b);
  assert.ok(problems.some((p) => pattern.test(p)), `expected ${pattern}, got ${JSON.stringify(problems)}`);
};
const withPolicy = (policy) => ({ ...brief, policy: { ...brief.policy, ...policy } });
const body = () => sample().body_md;

test("validate: one failing case per rule", () => {
  bad({ slug: "Not Kebab" }, /kebab-case/);
  bad({ title: "x".repeat(61) }, /title is required/);
  bad({ meta_description: "short" }, /meta_description is 5/);
  bad({ meta_description: "x".repeat(156) }, /meta_description is 156/);
  bad({ excerpt: "x".repeat(301) }, /excerpt/);
  bad({ tags: ["a", "b"] }, /tags: 3 to 6/);
  bad({ primary_keyword: "" }, /primary_keyword/);
  bad({ body_md: "word ".repeat(100) }, /minimum 1000/);
  bad({}, /maximum 5/, withPolicy({ max_words: 5 }));
  bad({ body_md: body().replace("## What to do next", "## Something else") }, /missing required H2 section: What to do next/);
  bad({ body_md: body() + "\n\nThis result is guaranteed." }, /banned phrase present: guaranteed/);
  bad({ body_md: body().replace("for general information purposes only", "for fun") }, /general disclaimer/);
  bad({ body_md: body().replaceAll("(/contact)", "(/about)") }, /link to \/contact/);
  bad({ body_md: body().replace(/\]\(\/(?!contact\))[^)]*\)/g, "]") }, /internal links, must be 3 to 8/);
  bad({ body_md: body() + Array.from({ length: 6 }, (_, i) => `\n\n[x](/extra-${i})`).join("") }, /internal links, must be 3 to 8/);
  bad({ body_md: body() + "\n\n[x](/not-in-the-inventory)" }, /not in site_urls: \/not-in-the-inventory/);
  bad({ title: "A — dash" }, /dashes/);
  bad({ excerpt: "An – dash" }, /dashes/);
});

test("validate: forbidden fields are refused", () => {
  for (const f of ["is_published", "published_at", "review_status", "author_name", "allow_duplicate", "run_id"]) {
    bad({ [f]: f === "is_published" ? true : "x" }, new RegExp(`not allowed in a queue file: ${f}`));
  }
});

test("buildPayload copies the allow-list only and adds run_id", () => {
  const p = buildPayload({ ...sample(), is_published: true, review_status: "approved", author_name: "x", extra: 1 }, "run-1");
  assert.deepEqual(Object.keys(p).filter((k) => !ALLOWED_FIELDS.includes(k)), ["run_id"]);
  assert.equal(p.run_id, "run-1");
  for (const f of ["is_published", "published_at", "review_status", "author_name", "allow_duplicate", "extra"]) assert.equal(f in p, false);
});

test("internalLinks drops query and hash, dedupes, ignores outside links", () => {
  assert.deepEqual(internalLinks("[a](/contact) [b](https://x.com) [c](/about#top) [d](/contact/) [e](/)"), ["/contact", "/about", "/"]);
});
