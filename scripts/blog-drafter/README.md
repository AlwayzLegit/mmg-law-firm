# Blog drafter (queue branch route)

Files one post on mmg-lawfirm.com as a **draft for attorney review**, from GitHub, so no task holds the content agent key. It never publishes: the key has no `blog:publish` right and an attorney approves every post.

## How a draft gets filed

1. Branch from **current main**: `crew/post-<YYYY-MM-DD>`. A push runs the workflow and script of the pushed branch, so an old base runs old rules.
2. Add exactly one file, `scripts/blog-drafter/queue/<slug>.json`, and push.
3. `.github/workflows/blog-draft.yml` runs `draft.mjs` with the key from the repository secret `MMG_API_KEY`, then deletes the branch. Queue branches are never merged.

## What the script does

Read the live brief (`GET /api/admin/agent/brief`). Stop when `policy.pause_drafting` is true, when the cap is reached, or when the post breaks the brief. Only then start a run (`POST /api/admin/agent/runs`, agent `crew-blog-desk`), create the draft (`POST /api/admin/blog`, with `Idempotency-Key`), check it is `needs_review`, unpublished and 404 on the public page, and finish the run report. Any failure after the run starts ends it as `failed`. A `409 duplicate_topic` ends it as skipped and is never retried with another slug.

## Queue file fields

`title` (60 max), `slug`, `body_md`, `excerpt` (300 max), `meta_description` (120 to 155), `tags` (3 to 6), `primary_keyword`, optional `secondary_keywords`, `practice_area_ids`, `related_county_ids`, `hero_image_url`, `hero_image_alt`, `topic_id`. Firm facts and the four disclaimers come from `src/lib/constants.ts`; the general disclaimer must appear word for word.

## What is refused

- The cap: 3 drafts or posts filed in any 7 days, every status and source, counted by `created_at`. A constant; no flag, env var or queue field changes it.
- Any of `is_published`, `published_at`, `review_status`, `author_name`, `allow_duplicate`, `run_id` in the file.
- A post that breaks the brief: word range, required H2 sections, banned phrases, `/contact` link, 3 to 8 internal links all in `site_urls`, em or en dashes.
- A slug starting with `sample-` in a real run.

Logs and the job summary hold numbers and section names only, never the instructions text or the key.

## Try it

```
node --test scripts/blog-drafter/*.test.mjs
node scripts/blog-drafter/draft.mjs scripts/blog-drafter/sample-post.json --dry-run --offline
```

With `MMG_API_KEY` set, `--dry-run` without `--offline` reads the live brief and post list and creates nothing.
