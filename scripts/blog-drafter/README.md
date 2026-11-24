# Blog drafter (queue branch route)

Files one post on mmg-lawfirm.com as a **draft for attorney review**, from GitHub, so no task holds the content agent key. It never publishes: the key has no `blog:publish` right and an attorney approves every post.

## How a draft gets filed

1. Branch from **current main**: `crew/post-<YYYY-MM-DD>`. A push runs the workflow and script of the pushed branch, so an old base runs old rules.
2. Add exactly one file, `scripts/blog-drafter/queue/<slug>.json`, and push.
3. `.github/workflows/blog-draft.yml` runs `draft.mjs` with the key from the repository secret `MMG_API_KEY`, then deletes the branch. Queue branches are never merged.

## What the script does

Read the live brief (`GET /api/admin/agent/brief`). Stop when `policy.pause_drafting` is true, when the cap is reached, or when the post breaks the brief. Only then start a run (`POST /api/admin/agent/runs`, agent `crew-blog-desk`), create the draft (`POST /api/admin/blog`, with `Idempotency-Key`), check it is `needs_review`, unpublished and 404 on the public page, and finish the run report. Any failure after the run starts ends it as `failed`. A `409 duplicate_topic` ends it as skipped and is never retried with another slug.

## How required sections are matched

Each key in the brief's `required_sections` names a kind of section, not the words of a heading, and every key is still required. A key is met when some H2 carries the key read in words (hyphens and case do not matter, whole words only) or one of its aliases: `intro` (introduction, overview, or 40 words before the first H2), `what-to-do` (what to do, steps to take, next steps), `deadlines` (deadline, time limit, how long, how soon, when to file, statute of limitations), `how-a-lawyer-helps` (a heading with lawyer or attorney), `faq` (faq, frequently asked questions, common questions), `cta` (contact, talk, get help, next step, free case, consultation, call, or a last section, not counting Sources or References, that links to /contact). A key not in this list is read in words with no alias. A refusal names the accepted words, for example `missing required H2 section: deadlines (a heading with deadlines, deadline, time limit, ...)`. The aliases live in `SECTION_ALIASES` in `draft.mjs`.

## Queue file fields

`title` (60 max), `slug`, `body_md`, `excerpt` (300 max), `meta_description` (120 to 155), `tags` (3 to 6), `primary_keyword`, optional `secondary_keywords`, `practice_area_ids`, `related_county_ids`, `hero_image_url`, `hero_image_alt`, `topic_id`. One more field feeds the quality check and is never sent to the site: `desk`, the Blog desk's verdict on six points, each `{ "pass": true, "saw": "what it saw" }` (`need`, `new`, `true`, `site_rules`, `voice`, `not_a_repeat`); a file that leaves one out is refused. Firm facts and the four disclaimers come from `src/lib/constants.ts`; the general disclaimer must appear word for word.

## What is refused

- The cap: 3 drafts or posts filed in any 7 days, every status and source, counted by `created_at`. A constant; no flag, env var or queue field changes it.
- Any of `is_published`, `published_at`, `review_status`, `author_name`, `allow_duplicate`, `run_id` in the file.
- A post that breaks the brief: word range, required H2 sections, banned phrases, `/contact` link, 3 to 8 internal links all in `site_urls`, em or en dashes.
- A draft that fails any point of the quality check, including a missing `desk` verdict.
- A slug starting with `sample-` in a real run.

Logs and the job summary hold numbers and section names only, never the instructions text or the key.

## The quality check (OPS-317)

`quality-check.mjs` runs on every queue file in every mode (real, `--dry-run`, `--dry-run --offline`), after the brief and the cap are read and before anything is written. It prints one line per point ("pass" or "FAIL" with what it saw) and `check: N of 17 pass`; the lines print also when the cap or a pause refuses. Any FAIL refuses the draft with the reasons. A pass never publishes anything: the draft is filed as needs review and the attorney still reviews and publishes it.

The six desk points are judgment, made by the Blog desk against the site's published posts; the script only refuses a missing or empty verdict. The eleven measured points: `title_meta` (title, meta description and excerpt rules of `validate`), `one_h1` (no `# ` line in the body), `target_in_title_and_first_100_words` (the `primary_keyword`), `internal_links` (the brief's count and `site_urls`), `contact_link`, `faq` (3 questions, only when the brief requires a FAQ section), `image_alt` (10 to 200 characters when a hero image is set), `links_200` (every link answers 200; offline runs only check that links are well formed and say so), `no_competitor_links` (an external link must be https to a `.gov` host and not look like another law firm, a directory or a lead seller), `no_dashes`, and `markdown` (the brief's word range, required sections, banned phrases and disclaimer, plain Markdown, no skipped heading level). Every problem `validate` reports lands under one of these points.

## Try it

```
node --test scripts/blog-drafter/*.test.mjs
node scripts/blog-drafter/draft.mjs scripts/blog-drafter/sample-post.json --dry-run --offline
node scripts/blog-drafter/draft.mjs scripts/blog-drafter/fixtures/failing-draft.json --dry-run --offline   # exits 1: markdown, three missing sections
```

The sample and the fixture brief (`fixtures/brief.json`) mirror the live brief, instructions v1, and link only the static URLs of `src/lib/content-agent/site-urls.ts`; when the owner changes the brief in the admin, refresh both.

With `MMG_API_KEY` set, `--dry-run` without `--offline` reads the live brief and post list and creates nothing.
