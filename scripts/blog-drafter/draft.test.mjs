import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { ALLOWED_FIELDS, CAP, SECTION_ALIASES, WINDOW_DAYS, buildPayload, capCheck, capLine, hasSection, internalLinks, validate } from "./draft.mjs";

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
  bad({ body_md: "word ".repeat(100) }, /minimum 1200/);
  bad({}, /maximum 5/, withPolicy({ max_words: 5 }));
  bad({ body_md: body().replace("## Deadlines", "## Something else") }, /missing required H2 section: deadlines/);
  bad({ body_md: body() + "\n\nThis result is guaranteed." }, /banned phrase present: guaranteed/);
  bad({ body_md: body().replace("for general information purposes only", "for fun") }, /general disclaimer/);
  bad({ body_md: body().replaceAll("(/contact)", "(/about)") }, /link to \/contact/);
  bad({ body_md: body().replace(/\]\(\/(?!contact\))[^)]*\)/g, "]") }, /internal links, must be 3 to 8/);
  bad({ body_md: body() + Array.from({ length: 6 }, (_, i) => `\n\n[x](/extra-${i})`).join("") }, /internal links, must be 3 to 8/);
  bad({ body_md: body() + "\n\n[x](/not-in-the-inventory)" }, /not in site_urls: \/not-in-the-inventory/);
  bad({ title: "A — dash" }, /dashes/);
  bad({ excerpt: "An – dash" }, /dashes/);
});

test("the fixture brief and the sample mirror the live contract", () => {
  const staticUrls = readFileSync(new URL("../../src/lib/content-agent/site-urls.ts", import.meta.url), "utf8")
    .match(/export const STATIC_URLS = \[([^\]]*)\]/)[1]
    .match(/"([^"]+)"/g)
    .map((q) => q.slice(1, -1));
  assert.equal(staticUrls.length, 6);
  assert.deepEqual(brief.site_urls.static, staticUrls);
  assert.deepEqual(brief.policy.required_sections, ["intro", "what-to-do", "deadlines", "how-a-lawyer-helps", "faq", "cta"]);
  assert.equal(brief.policy.min_words, 1200);
  assert.equal(brief.policy.banned_phrases.length, 7);
  const links = internalLinks(sample().body_md);
  assert.ok(links.length >= 3 && links.length <= 8);
  for (const l of links) assert.ok(staticUrls.includes(l), `${l} is not a static URL`);
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

// Required sections are kinds of sections (OPS-254): a heading in reader words meets a key, every key is still required.
const FILLER = "word ".repeat(40).trim();
const para = (n = 40) => Array.from({ length: n }, () => "word").join(" ");
const sectionProblems = (post) => validate({ ...sample(), ...post }, brief).filter((p) => /missing required H2 section/.test(p));
const missingKeys = (post) => sectionProblems(post).map((p) => p.match(/section: ([a-z-]+)/)[1]);
const mdPost = (parts) => ({ body_md: parts.join("\n\n") });

test("sections: the headings of a live post, plus a deadlines and a lawyer heading, meet every key", () => {
  const post = mdPost([
    FILLER,
    "## What California Minimum Car Insurance Requires Today",
    para(),
    "## Why 30/60/15 Isn't Enough in a Serious Crash",
    para(),
    "## What to Do When the At-Fault Driver Has Minimum Coverage",
    para(),
    "## The Penalty for Driving Without Insurance in California",
    para(),
    "## Reporting Requirements After a California Crash",
    para(),
    "## Deadlines to know",
    para(),
    "## How a lawyer can help",
    para(),
    "## Frequently Asked Questions",
    para(),
    "## Ready to talk?",
    "Reach the firm through [the contact page](/contact).",
  ]);
  assert.deepEqual(missingKeys(post), []);
});

test("sections: a draft shaped like OPS-39 still lacks deadlines, how-a-lawyer-helps and cta", () => {
  const post = mdPost([
    "## Overview",
    para(),
    "## When the DMV report is required",
    para(),
    "## Who has to file, and how",
    para(),
    "## What happens if you do not file",
    para(),
    "## A separate duty: the police report",
    para(),
    "## How the SR-1 can relate to an injury claim",
    para(),
    "## What to do next",
    "Reach the firm through the [contact page](/contact).",
    "## Frequently asked questions",
    para(),
    "## Sources",
    "- California DMV",
  ]);
  assert.deepEqual(missingKeys(post).sort(), ["cta", "deadlines", "how-a-lawyer-helps"]);
});

test("sections: the refusal names the words a heading can use", () => {
  const [problem] = sectionProblems({ body_md: body().replace("## Deadlines to know", "## Something else") });
  assert.match(problem, /^missing required H2 section: deadlines \(a heading with deadlines, deadline, time limit/);
  assert.equal(/[\u2013\u2014]/.test(problem), false);
});

test("sections: an unknown key is read in words, with no alias", () => {
  const keyed = withPolicy({ required_sections: [...brief.policy.required_sections, "sources"] });
  assert.deepEqual(validate(sample(), keyed).filter((p) => /missing required/.test(p)), ["missing required H2 section: sources (a heading with sources)"]);
  const withSources = { ...sample(), body_md: body() + "\n\n## Sources\n\n- California DMV" };
  assert.deepEqual(validate(withSources, keyed).filter((p) => /missing required/.test(p)), []);
});

test("sections: cta is met by a last section that links to /contact, whatever its heading", () => {
  const h2 = ["Wrap up"];
  assert.equal(hasSection(h2, "cta", `${para()}\n\n## Wrap up\n\nSee [us](/contact).`), true);
  assert.equal(hasSection(h2, "cta", `${para()}\n\n## Wrap up\n\nSee [us](/about).`), false);
  // Sources and References do not count as the last section.
  assert.equal(hasSection(["Wrap up", "Sources"], "cta", "## Wrap up\n\n[us](/contact)\n\n## Sources\n\n- a"), true);
  // A link in an earlier section is not a closing call to action.
  assert.equal(hasSection(["Wrap up", "More"], "cta", "## Wrap up\n\n[us](/contact)\n\n## More\n\ntext"), false);
});

test("sections: intro is met by 40 words before the first H2, and not by 39", () => {
  assert.equal(hasSection(["Facts"], "intro", `${para(40)}\n\n## Facts\n\ntext`), true);
  assert.equal(hasSection(["Facts"], "intro", `${para(39)}\n\n## Facts\n\ntext`), false);
  assert.equal(hasSection(["Facts"], "intro", "## Facts\n\ntext"), false);
  assert.equal(hasSection(["Overview"], "intro", "## Overview\n\ntext"), true);
});

test("sections: whole words only, hyphens and case do not matter", () => {
  assert.equal(hasSection(["Medically Speaking"], "cta", ""), false);
  assert.equal(hasSection(["What-To-Do after a crash"], "what-to-do", ""), true);
  assert.equal(hasSection(["How-a-lawyer-helps in review"], "how-a-lawyer-helps", ""), true);
  assert.equal(hasSection(["Time limits for a claim"], "deadlines", ""), true);
  assert.equal(hasSection(["Statute of limitations"], "deadlines", ""), true);
  assert.deepEqual(Object.keys(SECTION_ALIASES), brief.policy.required_sections);
});
