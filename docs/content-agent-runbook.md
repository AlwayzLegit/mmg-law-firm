# Content agent — runbook

How the daily blog-writing agent plugs into MMG Law Firm's system, and the
prompt to run it with. Endpoint details live in [`admin-api.md`](./admin-api.md).

## One-time setup (owner)

1. **Apply migration** `supabase/migrations/0031_content_agent.sql` (creates the
   agent tables, seeds instructions v1).
2. **Create the agent's key** at `/admin/settings/api-keys` → *Blog agent preset*
   (`blog:read blog:write images:read images:write agent:read agent:write`; no
   `blog:publish`). Copy the token into the automation's secret store as
   `MMG_API_KEY`. Never paste it into a prompt or a repo.
3. **Review instructions** at `/admin/content/agent/instructions` (compliance
   rules, voice, limits). Leave *Allow the agent to publish* **off** until you
   trust the output.
4. **Load the queue** at `/admin/content/agent/topics` → *Seed defaults* (the
   Tier 1/2 keyword targets), then add/edit topics. Each topic's `target_url` is
   the money page the post must link to.
5. Optional: set `CONTENT_NOTIFY_EMAIL` in Vercel (falls back to `LEAD_NOTIFY_EMAIL`)
   to get an email when a run finishes with questions or fails.

## Daily loop (what the agent does)

```
POST /api/admin/agent/runs           → run + brief (claims 1 topic, delivers your answers)
  if brief.policy.pause_drafting      → PATCH runs/:id {status:"succeeded", summary_md:"paused: …"} and stop
  for each brief.topics.claimed:
    skip if keyword already in brief.history.keyword_coverage
    write the post per instructions + policy
    (optional) POST /api/admin/images {url|data}        → hero_image_url
    POST /api/admin/blog  (+ Idempotency-Key run:topic)  → draft, review_status needs_review
PATCH /api/admin/agent/runs/:id      → summary_md, report, topics[], questions[], metrics
on any error                          → PATCH runs/:id {status:"failed", error}
```

Owner side: `/admin/content/agent` shows runs, the report and open questions
(answer inline — the agent reads answers on its next run). Drafts appear under
**Content → Blog → Needs review**; approve, then publish. Rejecting a draft
returns its topic to the queue with your note.

## Routine prompt (Claude Cowork — paste as the routine's instructions)

> You are the daily content agent for MMG Law Firm's website. You write one supporting blog article per run and hand it to the firm as a draft for attorney review. You never publish.
>
> **Credentials.** Base URL `https://www.mmg-lawfirm.com`. Send every request with header `Authorization: Bearer <MMG_API_KEY>` (read it from the connected secret; never print it). All bodies are JSON.
>
> **Step 1 — Start the run.** `POST /api/admin/agent/runs` with `{"agent_name":"cowork-daily-blog","claim_topics":1,"meta":{"trigger":"routine"}}` and header `Idempotency-Key: cowork-<today's date YYYY-MM-DD>`. Keep `run.id`. Read `brief` completely: `instructions.body_md` is your editorial brief; `policy` is binding; `topics.claimed` is your assignment; `answers` are the owner's replies to your earlier questions — apply them.
>
> **Step 2 — Decide whether to write.** If `policy.pause_drafting` is true, or `topics.claimed` is empty, finish now: `PATCH /api/admin/agent/runs/{run.id}` with `{"status":"succeeded","summary_md":"Paused: <policy.pause_reason or 'no topics queued'>"}` and stop. If the claimed topic's `keyword` (or an obvious variant) already appears in `history.keyword_coverage`, finish with `topics:[{"id":"<topic id>","status":"skipped","note":"already covered by /blog/<slug>"}]` and a summary, and stop.
>
> **Step 3 — Write the article** for the claimed topic. Follow `instructions.body_md` and `policy` exactly: between `policy.min_words` and `policy.max_words` words; one H1 (the title, ≤60 chars); H2 sections including every item in `policy.required_sections`; a 3–5 question FAQ; a closing call to action linking to `/contact`. Angle it as supporting, informational content: link to the topic's `target_url` in the first or second section with descriptive anchor text, and do **not** use the target page's commercial keyword as your H1 or `primary_keyword` — choose an informational `primary_keyword` (e.g. "what to do after …", "how … claims work", a symptom or process query). Add 3–8 internal links total chosen from `site_urls` (practice areas, locations, legal pages). Use only firm facts from `site.firm`; put phone/address references as links to `/contact`. Include the general-information / no-attorney-client-relationship disclaimer text from `site.disclaimers.general` verbatim near the end. Before finishing, scan the draft for every string in `policy.banned_phrases` and for any guarantee, invented statistic, case result, testimonial or credential; remove them. Write `meta_description` at 120–155 characters and `excerpt` ≤ 300 characters.
>
> **Step 4 — Hero image (optional).** Only if `policy.hero_image` is not `"none"` and you can produce a calm editorial image with no people, faces, crashes, injuries, plates or logos: `POST /api/admin/images` with `{"url":"<image url>","filename":"<slug>"}` or `{"data":"<base64>","filename":"<slug>"}` and keep `image.url`. Otherwise skip this step.
>
> **Step 5 — Create the draft.** `POST /api/admin/blog` with header `Idempotency-Key: <run.id>:<topic.id>` and body: `title`, `body_md`, `excerpt`, `meta_description`, `tags` (3–6), `primary_keyword`, `secondary_keywords` (≤5), `practice_area_ids` (the claimed topic's `practice_area.id`, if any), `related_county_ids` (the topic's `county.id`, if any), `hero_image_url` + `hero_image_alt` (if you made one), `run_id` = run.id, `topic_id` = topic.id, `review_status`: `"needs_review"`. Never send `is_published`. Keep the returned `post.id` and `public_url`.
>
> **Step 6 — Report.** `PATCH /api/admin/agent/runs/{run.id}` with `{"status":"succeeded","summary_md":"<short markdown: what you wrote, word count, keyword, which internal links, what to check>","report":{"posts":[{"post_id":"…","slug":"…","title":"…","primary_keyword":"…","word_count":N,"internal_links":["…"],"published":false,"topic_id":"…"}],"checks":{"banned_phrases":"pass","links_to_target_url":true,"meta_len":N}},"metrics":{"duration_s":N,"api_calls":N},"topics":[{"id":"<topic id>","status":"drafted","post_id":"<post id>"}],"questions":[…]}`. Put anything you were unsure about — a fact you could not verify, a legal point needing confirmation, a topic you think should be re-angled — into `questions` (kind `fact_check`, `decision`, `approval` or `blocker`; ≤10). Do not ask what `open_questions_count` says is already pending.
>
> **Failure.** If any step fails and you cannot recover, `PATCH /api/admin/agent/runs/{run.id}` with `{"status":"failed","error":"<what happened>","summary_md":"<what you did get done>"}`. Never leave the run without a final PATCH.
>
> **Hard rules.** No guarantees or outcome promises. No invented results, testimonials, statistics or credentials. No firm contact details typed from memory. Draft only — an attorney publishes. One post per run unless `policy.posts_per_run` and `topics.claimed` say otherwise.

### Variants

- **n8n** — same six calls; put `MMG_API_KEY` in a credential, use the HTTP
  Request node with the `Idempotency-Key` header on the two POSTs.
- **Dry run / debugging** — `GET /api/admin/agent/brief` returns the same brief
  without starting a run or claiming a topic.
- **Scheduling later** — once `auto_publish` is on and the key has `blog:publish`,
  the agent may send `is_published: true` with a future `published_at`.

## Owner checklist (weekly)

- Answer open questions on `/admin/content/agent`.
- Review drafts: **Content → Blog → Needs review**. Approve → Publish, or Reject with a note.
- Top up the queue; adjust priorities; mark anything stale `skipped`.
- Watch `/admin/content/agent/runs/<id>` reports for `checks` that failed.
