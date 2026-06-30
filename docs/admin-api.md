# MMG Law Firm — Admin API

Machine-to-machine API for posting blog content and managing images from
external tools (n8n, Claude Cowork, scripts). Base URL: `https://mmg-lawfirm.com`.

## Authentication

Every request needs a bearer token:

```
Authorization: Bearer <ADMIN_API_KEY>
```

`ADMIN_API_KEY` is a single shared secret set in Vercel env. Rotate by changing
it there. When it's unset the API returns `503`. A bad/missing token returns
`401`. **Send this only over HTTPS; never embed it in client-side code.**

All responses are JSON. Errors look like `{ "error": "…" }` (validation errors
also include an `issues` object).

---

## Blog posts — `/api/admin/blog`

Full CRUD. A post needs at minimum a `title` and `body_md`. The `slug` is
auto-derived from the title (and de-duplicated) when omitted.

### List — `GET /api/admin/blog`
Query: `status=all|published|draft` (default `all`), `limit` (1–100, default 20),
`offset` (default 0). Returns `{ posts, count, limit, offset }`.

```bash
curl -s "https://mmg-lawfirm.com/api/admin/blog?status=published&limit=10" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### Create — `POST /api/admin/blog`
Body fields:

| field | type | notes |
|---|---|---|
| `title` | string | **required**, 2–160 chars |
| `body_md` | string | **required**, markdown, ≤50k |
| `slug` | string | optional; auto-derived + deduped if omitted |
| `subtitle` | string | optional |
| `excerpt` | string | optional, ≤400 — blog-index teaser |
| `hero_image_url` | string (URL) | optional — use an `/api/admin/images` URL |
| `meta_description` | string | optional, ≤220 — SEO |
| `author_name` | string | optional |
| `tags` | array \| comma-string | optional, ≤16 |
| `practice_area_ids` | uuid[] | optional |
| `related_county_ids` | uuid[] | optional |
| `is_published` | boolean | default `false` (draft) |
| `published_at` | ISO datetime | optional — a **future** value schedules the post |

Returns `201 { post }`. A slug collision returns `409`.

```bash
curl -s -X POST "https://mmg-lawfirm.com/api/admin/blog" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "5 Things to Do After a Car Accident in Glendale",
    "body_md": "## Stay calm\n\nFirst, check for injuries…",
    "excerpt": "A practical checklist for the minutes after a crash.",
    "tags": ["car accidents", "glendale"],
    "is_published": true
  }'
```

**Scheduling:** set `is_published: true` with a future `published_at`. The post
stays hidden until that time; a cron surfaces it within the hour.

### Read — `GET /api/admin/blog/:id`
Returns `{ post }` (draft or published) or `404`.

### Update — `PATCH /api/admin/blog/:id`
Partial update — send only the fields you want to change. Same field set as
Create. Changing `slug` re-checks uniqueness (`409` on clash). Setting
`is_published: true` with no date publishes now; `published_at: null` unschedules.
Returns `{ post }`.

```bash
curl -s -X PATCH "https://mmg-lawfirm.com/api/admin/blog/<id>" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "is_published": true }'
```

### Delete — `DELETE /api/admin/blog/:id`
Returns `{ deleted: true, id }`.

---

## Images — `/api/admin/images`

Upload images to the public media CDN and get back a URL ready to drop into a
post's `hero_image_url` or inline markdown (`![alt](url)`). Allowed types: PNG,
JPEG, WebP, GIF, AVIF, SVG. Max 10 MB.

### Upload — `POST /api/admin/images`
Three ways, pick whatever your tool has on hand:

**1. Binary (multipart/form-data)** — a `file` field:
```bash
curl -s -X POST "https://mmg-lawfirm.com/api/admin/images" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -F "file=@/path/to/photo.jpg"
```

**2. Remote URL (JSON)** — the server fetches it (great for n8n nodes that
already hold an image URL, e.g. an AI image generator):
```bash
curl -s -X POST "https://mmg-lawfirm.com/api/admin/images" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://example.com/generated.png", "filename": "hero" }'
```

**3. Base64 (JSON)** — a raw base64 string or a full `data:` URL:
```bash
curl -s -X POST "https://mmg-lawfirm.com/api/admin/images" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "data": "data:image/png;base64,iVBORw0KGgo…", "filename": "chart" }'
```

All three return `201 { image: { url, name } }`. Use `image.url` as the post's
`hero_image_url`.

### List — `GET /api/admin/images`
Query: `limit` (1–100, default 50), `offset`. Returns
`{ images: [{ name, url, size, created_at }], limit, offset }`.

### Read — `GET /api/admin/images/:name`
`:name` is the object key (URL-encoded). Returns `{ image }` or `404`.

### Delete — `DELETE /api/admin/images/:name`
Returns `{ deleted: true, name }`.

---

## Taxonomy — `GET /api/admin/taxonomy`

Resolve names to the UUIDs that `practice_area_ids` / `related_county_ids`
expect. Returns `{ practice_areas: [{id,slug,name}], counties: [{id,slug,name}] }`.

```bash
curl -s "https://mmg-lawfirm.com/api/admin/taxonomy" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

---

## Typical n8n / Cowork flow

1. Generate or fetch a hero image → `POST /api/admin/images` (url or base64) →
   keep `image.url`.
2. Draft the post → `POST /api/admin/blog` with `body_md`, `hero_image_url`
   set to that URL, and `is_published: false` (or a future `published_at`).
3. (Optional) Human review in the admin → flip live with
   `PATCH /api/admin/blog/:id { "is_published": true }`.

## Status codes

`200` ok · `201` created · `400` bad request · `401` unauthorized ·
`409` slug conflict · `413` too large · `415` unsupported type ·
`422` validation failed · `500` server error · `503` API key not configured.

## Compliance note

Posts created via the API publish to a CA State Bar–regulated site. Keep the
content CRPC 7.1-compliant: no guarantees of outcome, no invented case results
or testimonials, and have an attorney review AI-drafted copy before it goes
live (draft first, publish after review).
