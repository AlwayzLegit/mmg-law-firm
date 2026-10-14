# MMG Law Firm — Admin API

Machine-to-machine API for blog content, media and the **content agent**
(the daily blog-writing automation). Base URL: `https://www.mmg-lawfirm.com`.
A machine-readable OpenAPI 3.1 document is served at
`GET /api/admin/openapi.json` (any valid key).

For the daily agent's end-to-end flow and a ready-to-paste routine prompt,
see [`content-agent-runbook.md`](./content-agent-runbook.md).

---

## Authentication

Every request needs a bearer token:

```
Authorization: Bearer <token>
```

Two kinds of token work:

| Kind | Where it comes from | Scopes |
|---|---|---|
| **Scoped API key** `mmg_<prefix>_<secret>` | `/admin/settings/api-keys` (owner only). Shown once; only its SHA-256 is stored. Revocable, optional expiry, per-key rate limit, named in the audit log. | Exactly the scopes chosen at creation |
| **Legacy shared key** | `ADMIN_API_KEY` env var in Vercel | Everything (`*`) — kept for existing n8n/Cowork flows; clear it once all clients use scoped keys |

### Scopes

| Scope | Grants |
|---|---|
| `blog:read` | List/read posts, taxonomy |
| `blog:write` | Create/edit/delete drafts |
| `blog:publish` | Set `is_published: true` (also needs `auto_publish` on — see Publishing policy) |
| `images:read` / `images:write` | List / upload+delete media |
| `leads:read` | Reserved |
| `agent:read` | Brief, topics, runs, history, instructions |
| `agent:write` | Start runs, write reports, add topics, ask questions |
| `agent:admin` | Publish instructions, answer questions, force-publish, change `review_status` |
| `*` | Everything |

Recommended daily-agent key: `blog:read blog:write images:read images:write agent:read agent:write` (no publish).

### Responses, errors, limits

- All responses are JSON. Errors: `{ "error": "…", "issues"?: {…}, "required"?: ["scope"] }`.
- `401` bad/missing token · `403` missing scope or policy denial · `409` conflict · `422` validation · `429` rate limited (`Retry-After` header) · `503` API not configured.
- **Rate limit**: per key, default 600 requests/hour (editable per key).
- **Idempotency**: `POST /api/admin/blog`, `POST /api/admin/agent/runs` and `POST /api/admin/agent/topics` accept an `Idempotency-Key` header (≤128 chars, scoped to your key, 24 h). Same key + same body → the stored response with `Idempotency-Replayed: true`; same key + different body → `422`; still in progress → `409`. Use it on every retryable write.

---

## Blog posts — `/api/admin/blog`

### Publishing policy (read this first)

Posts created through the API are **drafts awaiting attorney review**
(`is_published: false`, `review_status: "needs_review"`). An admin reviews
and publishes in `/admin/content/blog`. Publishing from the API
(`is_published: true`) is allowed only when **both** hold:

1. the key has the `blog:publish` scope, and
2. the owner has turned on **Allow the agent to publish** (`auto_publish`) in
   `/admin/content/agent/instructions` — unless the key also holds `agent:admin`.

Otherwise the request is refused with `403` and a message telling you to
create a draft instead. `review_status` can only be set directly by
`agent:admin` keys.

### Fields

| field | type | notes |
|---|---|---|
| `title` | string | **required**, 2–160 |
| `body_md` | string | **required**, markdown, ≤50k |
| `slug` | string | optional; auto-derived + de-duplicated |
| `subtitle` | string | ≤220 |
| `excerpt` | string | ≤400 — blog-index teaser |
| `hero_image_url` | URL | use a `/api/admin/images` URL |
| `hero_image_alt` | string | ≤200 — **set it** (accessibility + SEO) |
| `meta_description` | string | ≤220; aim for 120–155 |
| `author_name` | string | defaults to the attorney |
| `tags` | string[] \| csv | ≤16 |
| `practice_area_ids` | uuid[] | from `/api/admin/taxonomy` |
| `related_county_ids` | uuid[] | from `/api/admin/taxonomy` |
| `primary_keyword` | string | ≤120 — the query this post targets; feeds `keyword_coverage` |
| `secondary_keywords` | string[] \| csv | ≤10 |
| `run_id` | uuid | content agent: the running run that produced this post (sets `created_via: "agent"`) |
| `topic_id` | uuid | content agent: the queue topic this fulfils (must be queued or claimed by `run_id`) |
| `review_status` | enum | `agent:admin` only |
| `is_published` | boolean | see policy |
| `published_at` | ISO datetime | future value = scheduled |

Read-only on responses: `word_count`, `created_via`, `created_at`, `updated_at`.

### Endpoints

| | |
|---|---|
| `GET /api/admin/blog` | `status=all\|published\|draft\|needs_review\|approved\|rejected`, `limit` (≤100), `offset` → `{ posts, count, limit, offset }` |
| `POST /api/admin/blog` | create → `201 { post, public_url, review_status }`. `409` on slug clash, `404/409` on bad `run_id`/`topic_id` |
| `GET /api/admin/blog/:id` | `{ post }` |
| `PATCH /api/admin/blog/:id` | partial update, same fields; `published_at: null` unschedules |
| `DELETE /api/admin/blog/:id` | drafts only; `409` if published (unpublish first) |

```bash
curl -s -X POST "$BASE/api/admin/blog" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $RUN_ID:$TOPIC_ID" \
  -d '{
    "title": "What a Neck Injury Claim Looks Like After a California Car Crash",
    "body_md": "## Why neck injuries are disputed\n…",
    "excerpt": "…", "meta_description": "…",
    "hero_image_url": "https://…/media/…jpg", "hero_image_alt": "…",
    "primary_keyword": "neck injury lawyer",
    "secondary_keywords": ["whiplash claim california"],
    "tags": ["car accidents", "injuries"],
    "practice_area_ids": ["<uuid>"],
    "run_id": "<run uuid>", "topic_id": "<topic uuid>",
    "review_status": "needs_review"
  }'
```

---

## Images — `/api/admin/images`

Unchanged behaviour; scopes `images:read` (GET) / `images:write` (POST, DELETE).

- `POST` accepts **multipart** (`file` field), **JSON `{ url, filename? }`**
  (server fetches it) or **JSON `{ data, filename?, content_type? }`**
  (base64 or `data:` URL). PNG/JPEG/WebP/GIF/AVIF/SVG, ≤10 MB. Returns
  `201 { image: { url, name } }`.
- `GET /api/admin/images?limit&offset`, `GET|DELETE /api/admin/images/:name`.

Compliance for AI-generated hero images: no crash scenes, injuries, people
or faces, readable plates/logos. Prefer calm editorial scenes.

---

## Taxonomy — `GET /api/admin/taxonomy`

`{ practice_areas: [{id, slug, name}], counties: [{id, slug, name}] }` (`blog:read`).

---

## Content agent — `/api/admin/agent/*`

The loop is: **start a run → read the brief → write → create the post →
report back**. Owner answers to your questions arrive in the next run.

| Method | Path | Scope | Purpose |
|---|---|---|---|
| `POST` | `/agent/runs` | agent:write | **Start a run.** Sweeps stale runs, claims `claim_topics` queued topics (or `topic_ids`), marks answered questions delivered, returns `{ run, brief }`. Idempotent. |
| `PATCH` | `/agent/runs/:id` | agent:write | Heartbeat/progress (`status` omitted or `"running"`) or **finish** (`succeeded` \| `failed` \| `needs_human`) with `summary_md`, `report`, `metrics`, `topics[]`, `questions[]`, `error`, `log[]`. Unmentioned claimed topics go back to the queue. `409` if already finished. |
| `GET` | `/agent/runs`, `/agent/runs/:id` | agent:read | List; one run + its questions |
| `GET` | `/agent/brief` | agent:read | Read-only brief (dry run — no claim, no delivery). `urls_limit`, `history_limit`, `include=site_urls,history,seo_issues,answers` |
| `GET/POST` | `/agent/topics` | agent:read/write | Queue list (`status`, `q`, `limit`, `offset`); add one or `{ topics: [...], upsert }` (slugs or ids). Idempotent. |
| `GET/PATCH` | `/agent/topics/:id` | agent:read/write | Read; edit / set status (`skipped`/`queued` for agents; other statuses need agent:admin) |
| `GET/PUT` | `/agent/instructions` | agent:read / agent:admin | Active version (`?version=N`); publish a new version |
| `GET/POST` | `/agent/questions` | agent:read/write | List (`status`, `undelivered=1`); ask outside a run PATCH (`{ run_id, kind, question, context? }`) |
| `PATCH` | `/agent/questions/:id` | agent:admin | `{ answer }` or `{ status: "dismissed" }` |
| `GET` | `/agent/site-urls` | agent:read | Internal-link inventory (`limit` ≤1000, `offset`) |
| `GET` | `/agent/history` | agent:read | Posts + keyword coverage (`limit`, `offset`, `since`, `status`) |
| `GET` | `/openapi.json` | any | OpenAPI 3.1 |

### `POST /api/admin/agent/runs`

```jsonc
{ "agent_name": "cowork-daily-blog", "claim_topics": 1, "include_brief": true,
  "meta": { "trigger": "routine" } }
```

Response `201 { run: { id, status: "running", instructions_version, topics_claimed, … }, brief }`.

### The brief

| key | what it is |
|---|---|
| `site.firm` / `site.disclaimers` | Firm facts and the four verbatim disclaimers — the only source for names, phone, address text |
| `instructions.body_md` / `.settings` | The owner's standing instructions and settings (version pinned to the run) |
| `policy` | **Obey this.** `may_publish`, `default_review_status`, `min_words`/`max_words`, `internal_links`, `banned_phrases`, `required_sections`, `pause_drafting` + `pause_reason` (review backlog too big → finish the run without writing), endpoint reminders |
| `topics.claimed[]` | What to write this run: `keyword`, `intent`, `practice_area{slug,url}`, `county`, `city`, **`target_url`** (money page — link to it, never compete with it), `notes` |
| `topics.upcoming[]`, `topics.counts` | Context only |
| `history.recent_posts[]`, `history.keyword_coverage[]` | Dedupe guard: skip a topic whose keyword is already covered |
| `history.review_backlog[]`, `history.counts` | Drafts awaiting review |
| `answers[]` | Owner replies to your earlier questions (delivered once) |
| `open_questions_count` | Still unanswered — don't re-ask |
| `site_urls` | `practice_areas[]`, `counties[]`, `locations[]` (published city × practice pages), `legal[]`, `static[]`, `truncated` |
| `seo_issues[]` | Blog SEO problems the owner would like fixed (missing/long meta, thin body, missing keyword) |
| `last_run` | Previous run's status and summary |

### `PATCH /api/admin/agent/runs/:id` (finish)

```jsonc
{
  "status": "succeeded",
  "summary_md": "## What I did\n- Drafted *What a Neck Injury Claim Looks Like…* (1,740 words) → needs review\n…",
  "report": { "posts": [{ "post_id": "…", "slug": "…", "primary_keyword": "…", "word_count": 1740, "internal_links": ["/locations/…"], "published": false }],
              "skipped_topics": [], "checks": { "banned_phrases": "pass", "links_to_target_url": true, "meta_len": 148 } },
  "metrics": { "duration_s": 412, "api_calls": 6 },
  "topics": [{ "id": "<topic uuid>", "status": "drafted", "post_id": "<post uuid>" }],
  "questions": [{ "kind": "fact_check", "question": "Is the firm's founding year 2018 for the About mention?", "context": "…", "post_id": "<post uuid>" }],
  "log": ["started", "wrote 1740 words", "created post"]
}
```

A `succeeded` run that asks questions is recorded as `needs_human`. On any
error finish with `{ "status": "failed", "error": "…" }` — never leave a run
`running` (it is swept after `run_timeout_minutes`, releasing its topics).

---

## Status codes

`200` ok · `201` created · `400` bad request · `401` unauthorized · `403` forbidden (scope/policy) · `404` not found · `409` conflict · `413` too large · `415` unsupported type · `422` validation failed · `429` rate limited · `500` server error · `503` API key not configured.

## Compliance note

Everything here publishes to a California State Bar–regulated site. Keep
content CRPC 7.1-compliant: no guarantees of outcome, no invented case
results, testimonials or credentials, firm facts only from the brief, and an
attorney reviews AI-drafted copy before it goes live (draft first, publish
after review).
