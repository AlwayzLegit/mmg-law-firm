# Deploy guide — MMG Law Firm

End-to-end walkthrough from a fresh clone to a live, lead-collecting site
on `mmg-lawfirm.com`. Read top to bottom the first time; subsequent deploys
are just `git push`.

---

## 0. Accounts you need

Sign up before you start — each one takes a minute and costs nothing
to provision (you'll upgrade to paid tiers when you go live).

- [Vercel](https://vercel.com/signup) — hosting. **Pro plan required for
  production** (Hobby ToS forbids commercial use).
- [Supabase](https://supabase.com/dashboard) — database, auth, storage.
  **Pro plan required for production** (free tier pauses projects after 7
  days idle and has no point-in-time recovery).
- [Resend](https://resend.com/signup) — transactional email for lead
  notifications.
- [Cloudflare](https://dash.cloudflare.com/sign-up) — Turnstile (bot
  protection) and, if you want, DNS for the domain.
- [GitHub](https://github.com/join) — push the repo here so Vercel can
  deploy it.

You also need:

- The `mmg-lawfirm.com` domain (or whichever domain you'll deploy to)
  with DNS access.
- A working email at the domain to receive lead notifications and to
  serve as the Resend `FROM` address.

---

## 1. Push the repo to GitHub

```bash
gh repo create mmg-lawfirm --private --source=. --push
# or, manually:
git remote add origin git@github.com:<you>/mmg-lawfirm.git
git push -u origin main
```

The `.env.local` file is gitignored — your secrets stay local.

---

## 2. Set up Supabase

### 2a. Create the project

1. [Supabase dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a region close to your users (US-West for California traffic).
3. Save the database password somewhere safe — you'll only see it once.
4. Wait ~2 minutes for provisioning.

### 2b. Apply the migrations

Open **Project → SQL Editor** and run each file in `supabase/migrations/`
in order. Paste the contents of each file into a new query and click
**Run**.

| Order | File | What it does |
|---|---|---|
| 1 | `0001_init.sql` | Tables: counties, cities, practice_areas, location_pages, blog_posts, testimonials, case_results, leads, lead_notes, audit_log, admin_profiles. Indexes + `updated_at` triggers. |
| 2 | `0002_rls.sql` | Row-level security: public-read for published rows, admin-only otherwise. Defines the `is_admin()` helper. |
| 3 | `0003_seed_geo.sql` | Seeds California counties + Tier-1 cities. |
| 4 | `0004_attorney_profiles.sql` | Attorney bio table + Storage bucket `attorney-headshots`. Seeds Mihran's row (unpublished). |
| 5 | `0005_practice_areas_editor.sql` | Adds subtopics/what-to-do jsonb columns to `practice_areas`; seeds the 9 practice areas (unpublished). |
| 6 | `0006_legal_pages.sql` | `legal_pages` table + seeds 4 canonical rows (unpublished). |
| 7 | `0007_firm_settings.sql` | Singleton `firm_settings` row for founding year + sameAs URLs. |
| 8 | `0008_homepage_faqs.sql` | Adds `homepage_faqs_json` column to `firm_settings`. |

If you prefer the CLI:

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <your-project-ref>
pnpm dlx supabase db push  # applies all migrations
```

### 2c. Confirm the storage bucket

**Project → Storage** — you should see `attorney-headshots` (public,
created by migration 0004). If it isn't there, re-run 0004 and check
SQL output for errors.

### 2d. Grab the keys

**Project → Settings → API** — copy:

| Vercel env var | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | "Project API keys → anon public" |
| `SUPABASE_SERVICE_ROLE_KEY` | "Project API keys → service_role" — **secret, never expose to client** |

---

## 3. Create your admin profile

Two steps — first the auth user, then the admin_profiles row.

### 3a. Send yourself a magic link

Once the site is live (you can do this after the first deploy, or use a
local dev session pointed at the prod Supabase), go to `/login`, enter
the firm owner email, click the link in the email.

### 3b. Insert the admin row

In **Project → SQL Editor**, find your auth user UUID:

```sql
select id, email from auth.users order by created_at desc limit 5;
```

Then insert the admin row using that UUID:

```sql
insert into admin_profiles (user_id, role, full_name)
values ('<paste-uuid-here>', 'owner', 'Mihran M. Ghazaryan');
```

Reload `/admin` — you should now reach the dashboard. Without this row,
the auth gate redirects every signed-in user back to `/login`.

> Once one owner exists, additional admins can be invited from
> `/admin/settings` instead of running SQL.

---

## 4. Set up Resend

### 4a. Verify your sending domain

[Resend → Domains → Add Domain](https://resend.com/domains) — enter
`mmg-lawfirm.com`. Resend will give you DNS records to add (SPF + DKIM,
plus optional DMARC). Add them in your DNS provider, then click **Verify
DNS Records** in Resend. Verification takes 5–60 minutes for DNS
propagation.

### 4b. Create an API key

[Resend → API Keys → Create API Key](https://resend.com/api-keys) —
"Sending access" only is fine.

| Vercel env var | Value |
|---|---|
| `RESEND_API_KEY` | The key from above |
| `RESEND_FROM_EMAIL` | An address on the verified domain (e.g. `intake@mmg-lawfirm.com`) |
| `LEAD_NOTIFY_EMAIL` | The inbox that receives "new lead" notifications (e.g. `mihran@mmg-lawfirm.com`) |

If `RESEND_FROM_EMAIL` isn't on a verified domain, every send returns
422 and the lead form will look like it's working but no email lands.

---

## 5. Set up Cloudflare Turnstile

[Turnstile → Add Site](https://dash.cloudflare.com/?to=/:account/turnstile)
— give it a name like "MMG Law", widget mode **Managed**.

Hostnames to add:
- `mmg-lawfirm.com`
- `www.mmg-lawfirm.com`
- `localhost` (so your local dev sessions work too)
- Your Vercel preview URL pattern, e.g. `*.vercel.app`, if you use
  preview deploys

| Vercel env var | Value |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | "Site Key" — public |
| `TURNSTILE_SECRET_KEY` | "Secret Key" — server-only |

Without these, the lead form will fail every submission server-side.

---

## 6. Deploy to Vercel

### 6a. Import the GitHub repo

[Vercel → Add New → Project](https://vercel.com/new) → import the
`mmg-lawfirm` repo. Vercel auto-detects Next.js. Default build
settings (framework preset: Next.js, build command: `pnpm build`,
output directory: `.next`) are correct — don't override.

### 6b. Set env vars

In **Settings → Environment Variables**, add every variable from
`.env.local.example`. Apply each to **Production**, **Preview**, and
**Development** unless you have a reason to scope down.

| Variable | Required for prod? | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | Set to `https://www.mmg-lawfirm.com` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From step 2d |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From step 2d |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From step 2d — secret |
| `RESEND_API_KEY` | Yes | From step 4b |
| `RESEND_FROM_EMAIL` | Yes | From step 4b |
| `LEAD_NOTIFY_EMAIL` | Yes | From step 4b |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | From step 5 |
| `TURNSTILE_SECRET_KEY` | Yes | From step 5 |
| `REVALIDATE_SECRET` | Yes | Any random string — `openssl rand -hex 32` |
| `TWILIO_*` | No | Leave blank until 10DLC is registered |
| `NEXT_PUBLIC_GA_ID` | No | Add when GA4 is set up |

`src/lib/env.ts` will throw at runtime in production if any required
var is empty — the deploy will fail healthily rather than silently
operate broken.

### 6c. Connect the domain

**Settings → Domains** → add `mmg-lawfirm.com` and `www.mmg-lawfirm.com`.
Vercel shows the DNS records to add at your DNS provider. SSL is
automatic via Let's Encrypt once DNS resolves.

> If your DNS is on Cloudflare, set the records to **DNS only**
> (grey-cloud), not proxied. Vercel handles the certificate; double-proxying
> breaks it.

### 6d. Deploy

Push to `main` triggers a deploy automatically. Watch the build log —
the first deploy takes ~2 minutes. The build will run `pnpm build`,
generating ~73 pages (homepage + practice areas + location pages +
attorney bio + legal pages + admin shell).

---

## 7. Smoke test the live site

Walk through this checklist on the deployed URL:

- [ ] Homepage loads, hero + practice-areas grid render, no console errors
- [ ] `/practice-areas/car-accidents` renders with FAQs at the bottom
- [ ] `/locations/los-angeles-county/glendale` renders
- [ ] `/legal/privacy`, `/legal/disclaimer`, `/legal/ccpa`,
      `/legal/accessibility` all render
- [ ] `/attorneys/mihran-ghazaryan` renders the bio
- [ ] Footer shows "Established 2018" and the firm address
- [ ] `/contact` lead form: submit a test entry → check Supabase
      `leads` table for the row, check the LEAD_NOTIFY_EMAIL inbox for
      the notification
- [ ] `/login` → magic-link email arrives → click → land in `/admin`
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results)
      against the homepage — should detect LegalService + WebSite + Person

---

## 8. Populate real content

Open `/admin/content/pages` and walk through each editor:

| Editor | What to enter |
|---|---|
| `/admin/content/attorneys/<id>` | Real bio, headshot upload, education, bar admission date, federal-court admissions, sameAs URLs (Avvo/Justia/LinkedIn) |
| `/admin/content/practice-areas/<id>` | For each of the 9 areas: refine the in-code fallback body, finalize subtopics + what-to-do + FAQs, click **Publish** |
| `/admin/content/legal/<id>` | For each of 4 pages: refine, set effective date, click **Mark reviewed**, then **Publish** |
| `/admin/settings/firm` | Confirm founding year + sameAs URLs, refine homepage FAQs |
| `/admin/content/blog` | Optional — start writing |
| `/admin/content/testimonials` | Add real client testimonials with consent |
| `/admin/case-results` | Add real anonymized case results |
| `/admin/content/counties/<id>`, `/admin/content/cities/<id>` | Refine intro_md and local stats per location you want to publish |
| `/admin/content/location-pages` | For each city × practice area combo, fill in the unique `local_angle_md` (required to publish — empty pages stay hidden by RLS) |

Every editor pre-fills with the in-code fallback so you're refining
existing copy, not starting from blank.

---

## 9. After launch

- **Inbox triage**: leads flow into `/admin/leads`. Use the kanban view
  to move them through the pipeline (`new → contacted → qualified →
  signed | rejected`).
- **Spam handling**: lead form runs Cloudflare Turnstile + IP rate
  limiting (5 / hour) + heuristics. Suspect leads land with
  `status='spam'` and don't trigger notifications. Review the spam queue
  weekly.
- **Content review**: `/admin/content/legal` warns if any legal page
  hasn't been reviewed in 12 months (per spec §10.4). Click **Mark
  reviewed now** on each page annually.
- **Sitemap**: `/sitemap.xml` is generated dynamically from published
  rows. Submit it to Google Search Console once and it stays current.
- **Analytics**: when you add `NEXT_PUBLIC_GA_ID`, GA4 starts firing
  automatically. No additional config needed.

---

## 10. When you're ready for SMS

Once the firm completes 10DLC brand + campaign registration with a
carrier (typically through Twilio's regulatory portal or a third-party
aggregator), set the three `TWILIO_*` env vars in Vercel and redeploy.
The lead pipeline will start sending SMS notifications to the firm
phone in addition to email. Until then, leave them blank — the SMS
sender is stubbed and no-ops.

---

## 11. Common gotchas

- **"Edge runtime not supported"** — `src/proxy.ts` uses Node runtime by
  design (Supabase SSR doesn't work on edge). Don't add
  `export const runtime = "edge"` anywhere.
- **Magic link sends, but click goes to /login** — your auth user
  exists, but `admin_profiles` doesn't have a matching row. Run the
  step 3b SQL.
- **Lead form submits but no email arrives** — usually `RESEND_FROM_EMAIL`
  is on an unverified domain. Check Resend → Logs for the 422.
- **Static pages show stale content after editing in admin** — the
  server actions revalidate the touched paths, but Vercel's CDN can
  hold the old version for ~30 seconds. Hard-refresh once and it
  catches up.
- **JSON-LD missing** — sitewide LegalService graph emits via
  `<SchemaGraph />` in `src/app/layout.tsx`. Per-page schemas (article,
  FAQ, breadcrumb) emit from the page components. Validate with the
  Rich Results Test.
- **`/admin` 404 for everyone** — `proxy.ts` redirects `/admin/*` to
  `/login` when Supabase env vars are unset. If they're set but you
  still get redirected after login, see step 3b.
