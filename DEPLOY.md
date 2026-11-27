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
| 9 | `0009_security_hardening.sql` | Pins `set_updated_at()` search_path; locks down `attorney-headshots` listing; revokes `is_admin()` EXECUTE. |
| 10 | `0010_restore_is_admin_execute.sql` | Restores `is_admin()` EXECUTE for `anon`/`authenticated` (RLS policies need it). |
| 11 | `0011_firm_stats.sql` | Adds `years_practicing`, `settlements_total_display`, `cases_handled_display`, `consultations_display` to `firm_settings` (homepage "by the numbers" band). |
| 12 | `0012_rate_limits.sql` | Postgres-backed cross-instance rate limiter (`rate_limits` table + `bump_rate_limit()` RPC). Service-role-only writes. |
| 13–30 | `0013_…` → `0030_…` | Incremental features (trusted devices, follow-ups, redirects, media bucket, saved views, messages, tasks, content health, templates, lead merge/tags, redirects). Apply in order. |
| 31 | `0031_content_agent.sql` | Content-agent API: `api_keys` (scoped tokens), `agent_instructions`, `content_topics`, `agent_runs`, `agent_questions`, `api_idempotency`; blog review/keyword columns; `claim_content_topics()` RPC; service-role content-health function; seeds instructions v1. |
| 33 | `0033_private_auth_helpers.sql` | Moves `is_admin()` / `is_owner()` into the unexposed `app_private` schema. (There is no 0032 on `main`.) |
| 34 | `0034_drop_trusted_devices.sql` | Drops the device-trust table; admin login is email + password only. |
| 35 | `0035_admin_password_set.sql` | Adds `admin_profiles.password_set` (idempotent — a no-op where it was already added by hand). Required before `pnpm bootstrap-owner`. |
| 36 | `0036_lead_landing_url.sql` | Adds `leads.landing_url` (first-touch landing page; `source_url` stays the page the form was submitted from). |
| 37 | `0037_lead_intake_checklist.sql` | Adds `leads.intake` jsonb (intake checklist; `government_entity` switches the statute-of-limitations estimate to the 6-month claim). |
| 38 | `0038_lead_sla_alerted.sql` | Adds `leads.sla_alerted_at` + partial index so `/api/cron/sla-alerts` alerts each lead past the first-response target exactly once. |
| 39 | `0039_intake_read_only.sql` | Intake admins can read content and settings but not change them (editor-only write policies). |
| 40 | `0040_error_counts.sql` | Server error counts (OPS-21): `error_counts` table (RLS on, deny-all) plus `bump_error_count()` (service role only) and `error_counts_recent()` (two numbers, anon may read). `/api/health` shows `errors24h` and `errors3h` as `null` until this is applied. See `docs/error-count.md`. |

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

## 3. Create the first admin owner

There is no public sign-up and `/login` only accepts email + password, so
the first owner is created from your machine with the service-role key.
One command, idempotent, safe to re-run:

```bash
pnpm bootstrap-owner --email owner@mmg-lawfirm.com --name "Mihran Ghazaryan"
```

It reads `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and
`NEXT_PUBLIC_SITE_URL` from `.env.local` (or the environment), so point
those at the **production** project and the production site URL for a
live bootstrap. It creates the auth user (pre-confirmed), writes the
`admin_profiles` row as `owner`, and prints a one-time sign-in link.

Open the link in a browser: it signs you in and lands on `/onboarding`
to choose a password. From then on you sign in at `/login` with email +
password. The link works once and expires in an hour; re-run the script
for a fresh one.

No email is sent by this step on purpose — it works before Resend is
verified (§4). Once Resend is live, every later admin is invited from
`/admin/settings` and anyone locked out can self-serve with
“Forgot password?” on `/login`.

### How admin access works after that

| Situation | What to do |
|---|---|
| Add a colleague | Owner: `/admin/settings` → Invite. They get an email → “Set up your account” page → choose a password → `/admin`. Until then their row shows **Invite pending** with **Resend invite** / **Copy link**. |
| Invite email never arrived / link expired | Owner: **Resend invite**, or **Copy link** and send it by text. The invitee can also use “Forgot password?” on `/login`; it works before a password exists. |
| Forgot password | `/login` → “Forgot password?” → email → “Choose a new password” → sign in again. |
| Change your own password | `/admin/settings` → Security. |
| Revoke access | Owner: `/admin/settings` → Remove on their row (the last owner can't be removed). |

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

> **Since 2026-10-25 production is served by Cloudflare**, not Vercel:
> `www.mmg-lawfirm.com` and the apex are custom domains of the
> `mmg-law-firm` Worker (`routes` in `wrangler.jsonc`). Every merge to
> `main` that changes a file the Worker build reads starts the "Cloudflare deploy"
> workflow: it deploys staging first, reads the staging site from outside,
> and only then starts the production deploy, which waits for your approval
> in the Actions tab (OPS-58, see "What starts a production deploy"). If
> several merges pile up, cancel the older waiting runs and
> approve the newest: it ships everything merged so far. The Worker runs the scheduled jobs (`vercel.json` crons
> are empty). Vercel still builds every push but serves no traffic; it is
> kept, env vars untouched, as the rollback until 2026-11-24
> (`docs/cloudflare-migration-plan.md` §E). Production env vars therefore
> change in the GitHub environment `cloudflare-production`, then a
> production deploy. The rest of this section is the original Vercel setup.

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
| `NEXT_PUBLIC_SITE_URL` | Yes | Set to `https://www.mmg-lawfirm.com` (no trailing slash). **⚠️ Critical for SEO**: every canonical tag, `og:url`, JSON-LD `url`, sitemap `<loc>`, and robots `Host:` is derived from this. If it points to the wrong hostname (e.g. a branch preview alias like `mmg-law-firm-git-main-….vercel.app`), Google treats that hostname as canonical and ignores your real domain. Update + redeploy any time the canonical URL changes. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From step 2d |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From step 2d |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | From step 2d — secret |
| `RESEND_API_KEY` | Yes | From step 4b |
| `RESEND_FROM_EMAIL` | Yes | From step 4b |
| `LEAD_NOTIFY_EMAIL` | Yes | From step 4b |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | From step 5 |
| `TURNSTILE_SECRET_KEY` | Yes | From step 5 |
| `REVALIDATE_SECRET` | Yes | Any random string — `openssl rand -hex 32` |
| `CRON_SECRET` | Yes | Any random string — `openssl rand -hex 32`. Without it the four scheduled jobs (`src/lib/cron/schedules.ts`) return 503. Production only; the scheduler sends it as `Authorization: Bearer`. |
| `NEXT_PUBLIC_LOCALE_PAGES_LIVE` | No | `1` publishes the Armenian, Russian and Spanish pages (`/hy`, `/ru`, `/es` and their `/contact` pages): indexable, hreflang on the English home/contact pages, sitemap entries, language links in the footer and mobile menu. Unset (default) the pages still render but `noindex`, for attorney review of the translations (`src/lib/i18n/dictionaries/{hy,ru,es}.ts`). Build-time variable: redeploy after changing it. **Set to `1` since 2026-10-25** (owner decision, before attorney review) as a GitHub repository variable, which the Cloudflare builds read, and on Vercel production. |
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

### 6e. Cloudflare staging and production

The site also builds as a Cloudflare Worker (`pnpm cf:build`, deployed by
the "Cloudflare deploy (staging)" GitHub Actions workflow). The account
side and the exact order of steps are in `docs/cloudflare-migration-plan.md`
§C. Repo secrets come from your local `.env.local` via
`pnpm github-secrets` (uses `gh secret set`; nothing is printed). Any host
other than `NEXT_PUBLIC_SITE_URL` gets `X-Robots-Tag: noindex` from
`src/proxy.ts`, so staging and the workers.dev URL never compete with
production in search.

**Moving the production secrets from Vercel (one pass, no copying).**
Vercel never reveals "sensitive" values, so they are exported from inside a
production build instead: `pnpm build` first runs
`scripts/vercel-secrets-to-github.mjs`, which does nothing unless
`SYNC_SECRETS_GITHUB_TOKEN` is set. To run it once:

1. GitHub → Settings → Developer settings → Fine-grained tokens → Generate:
   repository `mmg-law-firm` only, permissions **Secrets: Read and write**
   and **Environments: Read and write**, expiry 1 day.
2. Vercel → Project → Settings → Environment Variables → add
   `SYNC_SECRETS_GITHUB_TOKEN` = that token, Production only.
3. Vercel → Deployments → latest production → Redeploy (without the build
   cache). The build log shows `[secrets-sync] set N/N: <key names>`.
4. Delete `SYNC_SECRETS_GITHUB_TOKEN` from Vercel and revoke the token.

The values land in the GitHub environments `cloudflare-production` and
`cloudflare-staging`, which the "Cloudflare deploy" workflow reads for the
build and forwards to the matching Worker (staging's build drops the
analytics keys). Keys not set on Vercel are listed as skipped. The
sync never fails the build.

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
- [ ] `/login` → sign in with the owner email + password → land in `/admin`
- [ ] `/login` → “Forgot password?” → email arrives → opens `/reset-password`
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
- **Sign-in link opens but lands on /login?error=not-admin** — the auth
  user exists, but `admin_profiles` has no matching row (or the
  `password_set` column is missing — apply migration 0035). Re-run
  `pnpm bootstrap-owner` for the owner, or invite the person from
  `/admin/settings`.
- **“Invalid email or password” for a new admin** — they never chose a
  password (invite link unused or expired). Resend the invite from
  `/admin/settings`, or they can use “Forgot password?” on `/login`.
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
  still get redirected after login, see §3.

## Health monitor (OPS-18)

`.github/workflows/health-monitor.yml` probes production from outside every
15 minutes (cron `7,22,37,52 * * * *`) with `scripts/health/probe.mjs`.
Read-only: it only sends GET, it never submits the lead form and never
requests `/api/leads`, and it holds no secret.

What it checks: the home page, the lead form on `/contact` twice (the stored
page copy, then `/contact?_rsc=health`, which skips the page store and is
rendered fresh by the app Worker, so a broken app Worker behind healthy stored
pages is caught), one `/_next/static/` script file named by the contact page
(a page from an older build can point at files the next deploy removed, and
then the form never hydrates), and `/practice-areas/car-accidents`. It tries
twice, 30 seconds apart, before it fails.

A red scheduled run is an Incident, and P1 when a contact check fails. If the
form check passes on the stored page but fails on `?_rsc=health`, the app
Worker is down behind healthy stored pages: that is the case this exists for.
If every check answers 403, Cloudflare is challenging the GitHub runner: that
needs a firewall rule from the owner, not a looser probe.

Cost: the repo is public, so GitHub bills 0 minutes for standard runners, at
about 2,900 runs a month. If the repo is ever made private this cadence would
cost about 2,900 minutes a month: slow the cron down first. To silence the
monitor at once: GitHub, Actions, Health monitor, Disable workflow.

A change to the workflow or the probe under `.github/` or `scripts/` starts no
"Cloudflare deploy" run: those paths are on the deploy skip list (see
"What starts a production deploy" below).

## Monitor (OPS-59)

A small Worker, `mmg-law-firm-monitor`, checks the site from Cloudflare every 15
minutes and serves its result at `GET /status`, so the check costs no GitHub
workflow minutes once the repo is private, and it keeps answering when the site
does not. It is not part of the site's two Workers and shares nothing with them.

- **What it checks.** The same list as the GitHub probe: `scripts/health/checks.mjs`
  (home page, the lead form twice, the verification fallback, one page script, a
  practice page and `/api/health`). GET only. A failed round is tried again after
  30 seconds before it counts.
- **Status address.** `https://mmg-law-firm-monitor.<account>.workers.dev/status`
  (the deploy run prints it). Fixed fields only: `v`, `ok`, `checkedAt`,
  `firstRoundAt`, `quietUntil`, `failingSince`, `streak`, `lines`, `lastFailure`,
  `alerts`, `wouldHaveRaised`, `incidents`. It answers 503 when no round is stored
  or the last one is over 45 minutes old (the monitor itself stopped) and 404 for
  everything else. Read it from GitHub: Actions, "Health monitor", Run workflow,
  job `monitor-status`.
- **Quiet start.** A new alarm records what it would have raised and raises
  nothing. The monitor is quiet for `QUIET_HOURS` (24, in
  `scripts/health/monitor/wrangler.jsonc`) after its first stored round: failures
  in that time go to `wouldHaveRaised` and open no incident.
- **Email is the owner's switch.** Without it `/status` says
  `"alerts":"not configured"` and nothing is emailed. To turn it on: GitHub,
  Settings, Secrets and variables, Actions, Variables, New repository variable
  `MONITOR_ALERT_EMAIL` with the address to tell, then Actions, "Monitor deploy",
  Run workflow. The workflow gives the monitor that address and the mail key the
  repo already holds (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`). One email when an
  incident starts, one an hour while it lasts, one when it ends. Take it back:
  delete the variable and run "Monitor deploy" again with no variable, then delete
  the three settings on the Worker in the Cloudflare dashboard.
- **Deploy.** `.github/workflows/monitor-deploy.yml`, on a push to `main` that
  changes `scripts/health/`, and by hand. It uses the environment
  `cloudflare-production`, so it waits for the same approval click. It has no pull
  request trigger: the job holds the Cloudflare token. The pull request rehearsal
  is the `self-test` job of "Health monitor": one real round of the Worker under
  `wrangler dev`, with no account and no secret.
- **Silence it.** Remove the `crons` line in `scripts/health/monitor/wrangler.jsonc`
  and run "Monitor deploy", or disable the trigger on the Worker in the Cloudflare
  dashboard. Deleting the Worker is done in the dashboard.
- The 15 minute GitHub check stays until the monitor's quiet record has been read
  (OPS-68 then removes it). Neither workflow starts a deploy of the site.

## What starts a production deploy (OPS-33)

A push to `main` starts the "Cloudflare deploy" workflow, unless every changed
file is on the skip list. The run deploys staging, checks it, and then deploys
production, which waits for your approval (see "The staging gate" below). The
list is the `paths:` block between the two `deploy-skip` comments in
`.github/workflows/cloudflare-deploy.yml`. It skips prose and things that run
outside the Worker: `docs/`, `*.md` outside `src/` and `public/`, `.github/`
(except the deploy workflow itself), `scripts/`, `tools/`, `supabase/`, tests
under `src/`, and `vitest.config.ts`. Everything else deploys, including
`src/**` (even `.md` files there), `public/**`, `cloudflare/`, `package.json`,
the lockfile and the Worker configs.

- The list is proven, not trusted. The pull request check "Deploy skip check"
  (`scripts/deploy-skip/check.mjs`) fails when a file the build reads could be
  skipped, when shipped code imports a skipped file or names a skipped folder,
  or when a shipped folder holds a dot-named file (GitHub's docs do not say how
  a path filter treats those). Its summary says whether merging that pull
  request will start a production deploy.
- To skip a new path, add it to the block with a comment saying why it is safe,
  and make the check pass. Do not add a path the check cannot prove.
- `.github/workflows/cloudflare-deploy-target.yml` (the workflow that does the
  work of one target) is a build input like the deploy workflow itself, so a
  change to it deploys. The check reads its `run:` lines too; the one line it
  allows to name a path under `scripts/` is the probe in its `check` job, which
  runs after the deploy and which the build never reads.
- A push touching more than 3,000 files may be judged wrongly by GitHub: check
  the Actions tab after such a merge.
- To ship by hand at any time: Actions, "Cloudflare deploy", Run workflow, target
  production. A change that was skipped by mistake ships with that run, after
  your approval. The approval on the `cloudflare-production` environment is
  your setting and this list never touches it.

## The staging gate (OPS-58)

A deploy of a merge to `main` is a line of stages, and a failed stage stops it:

1. `staging / deploy`: build and ship the staging Worker
   (`mmg-law-firm-staging` behind `mmg-law-firm-front-staging`, on
   `https://staging.mmg-lawfirm.com`). No scheduled jobs run there. Staging
   shares the production database, so a change that needs a hand-applied
   migration behaves as it did before this gate.
2. `staging / check`: `node scripts/health/probe.mjs --with-health` reads the
   staging site from outside (home page, the lead form twice, one page script,
   a practice page, `/api/health`). Read-only, no secret.
3. `production / deploy`: starts only when step 2 is green (`needs: staging`,
   no `always()` anywhere on the path). It still waits for the owner's click on
   the `cloudflare-production` environment until the owner removes that click.
4. `production / check`: the same probe against `https://www.mmg-lawfirm.com`.
   A red run here means the site is up on the new build but unhealthy: read
   `/api/health` and the Worker logs, then fix forward or ship by hand.

The gate proves the commit, not the bundle: staging and production are two
builds of the same commit, because `NEXT_PUBLIC_SITE_URL` and the analytics keys
are inlined at build time.

The three targets by hand (Actions, "Cloudflare deploy", Run workflow):

- `staging`: staging only, then its check. Cannot touch production.
- `production`: production alone, not gated. This is the way back when staging
  itself is broken. `cron_enabled` stays on unless you mean to pause the jobs.
- `rehearse-gate`: a test of the gate. Staging deploys, its check is pointed at a
  path that does not exist and must fail, and `production` must end the run as
  skipped. If `production` ever shows as waiting, queued or running in a
  rehearsal, cancel the run: the gate is wrong. The guard in the called workflow
  also refuses a rehearsal that reaches production.

Cost: about 18 billed minutes for every merge that touches the app (staging 9,
check 1, production 7, check 1) once the repo is private, against 7 before.
Public repos bill 0.

Way back: revert the merge commit. While the owner's click exists that restores
the old single job. Once the click is gone, fix forward or ship by hand with
target `production`, because a revert would deploy unchecked.

## D1 data layer (OPS-353 part 1)

Part 1 of moving the database from Supabase to Cloudflare D1 (OPS-353, owner
approved 2026-11-27). It adds the D1 schema and a drop-in query client and
changes nothing that runs: `DATA_PROVIDER` is unset everywhere, no wrangler
config names a D1 database, and production and staging still read and write
Supabase.

**What is in the repo**

- `migrations/d1/0001_schema.sql`: the 27 tables as they stand after Supabase
  migration 0040, with the indexes and the `updated_at` and `blog_posts.review_status`
  triggers. Same table and column names as Supabase, so rows can be copied 1:1
  later. Types: ids TEXT (UUID), timestamps ISO-8601 UTC TEXT, booleans INTEGER
  0/1, jsonb and arrays JSON TEXT.
- `src/lib/db/d1Client.ts`, `d1Sql.ts`: a PostgREST-compatible query client over
  a D1 binding, ported from The Look (commit a6db2f6). Same call shapes as
  supabase-js (`from().select().eq()...`, results `{ data, error, count, status }`,
  never rejects). Adds what MMG Law's queries use and The Look's did not: nested
  and `!inner` embeds, filters on embedded columns (`cities.counties.slug`),
  `.contains("tags", [...])`.
- `src/lib/db/d1Schema.generated.ts`: generated from the SQL by
  `pnpm d1:schema`; a test fails while it is stale.
- `src/lib/db/provider.ts`: the switch. `DATA_PROVIDER=d1` (exactly that value)
  sends `.from()` and `.rpc()` to the binding named `DB`; `.auth` and
  `.storage` still go to Supabase. Anything else leaves the Supabase client
  untouched. Wired into `getServiceSupabase`, `getServerSupabase` and
  `getStaticSupabase`.
- `scripts/cloudflare/pg-tables.mjs` and `src/lib/db/d1Schema.test.ts`: the test
  that fails when a table or column in `supabase/migrations` has no D1 twin, so
  a new Supabase migration cannot ship without its D1 change.
- CI job "D1 data layer": applies the schema to wrangler's local D1 (workerd)
  with `cloudflare/wrangler.d1-ci.jsonc` and runs `src/lib/db/d1Smoke.test.ts`,
  which prints `d1 smoke: N of 5`. No secret.

**What D1 mode does not have yet (part 2 and later), so nobody sets it first**

- Row-level security. D1 has none: the 49 Supabase policies must become
  server-side checks with a test per route before any traffic reads D1.
- The Postgres functions (`bump_rate_limit`, `claim_content_topics`,
  `content_health_issues`, `bump_error_count`, `error_counts_recent`, and the
  `is_admin` family). `rpc()` answers `PGRST202` for each until its part.
- The seed rows and the data copy, sign-in (Supabase Auth), file storage (R2),
  and the D1 database and its binding in `wrangler.jsonc`.

Differences to know when reading D1 results: `word_count` counts spaces, so
double spaces over-count by one (Postgres counts words); `agent_instructions.version`
has no sequence, the caller supplies it; `order()` and filters on a column of an
embedded table are not supported except the `!inner` filters above.

To run it locally: `pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config cloudflare/wrangler.d1-ci.jsonc --file migrations/d1/0001_schema.sql`, then
`D1_SMOKE=1 pnpm exec vitest run src/lib/db`.

## Front only and held enquiries (OPS-398)

**When to use it.** The app cannot be built or deployed (for example the database is down, so `pnpm cf:build` times out on the pages it prerenders), but enquiries must still be taken. The workflow `Cloudflare deploy` has two extra choices of `target`:

- `front-staging`: deploys only `mmg-law-firm-front-staging`.
- `front-production`: deploys only `mmg-law-firm-front`. It runs only on `main` (a branch can never put its front Worker on www), and its environment still waits for the owner's approval click.

Neither builds or deploys the app, sets secrets or pre-loads pages. The build id is read from the live site (`x-build-id` of `/contact`) and passed to the front Worker, so every stored page stays valid: a new build id would drop them all, and each page would then render against the database. The log prints `front only: BUILD_ID <id> (read from live)`. The probe after it skips `/api/health`, which fails for the database.

**Who starts it.** Claude in chat, or the Merge captain on staging. Production only after the owner's yes, with his click.

**What is held.** The front Worker (`src/lib/cloudflare/lead-hold.ts`) sits in front of `POST /api/leads`. When the app answers 500 `db-insert-failed`, or does not answer within 15 seconds, the enquiry is written to the private cache bucket under `held-leads/<date>/<id>.json` and the visitor sees the normal thank-you only after that write succeeded. Held: the lead fields the form posted (never the Turnstile token) and a consent record (time received, IP, user agent). Not held: anything else. A copy held on a timeout is deleted again when the app then answers with a 4xx or with a stored lead. While the database is down a real enquiry takes the app-timeout path (the rate limit waits on the database before anything else), so held records carry reason `app-timeout`, not `db-insert-failed`, and have not been checked by Turnstile: the replay in OPS-399 must check or drop them.

**Privacy.** While the database is down a held enquiry sits in an R2 object outside the database, readable by anyone with R2 access on the Cloudflare account. The 7 day lifecycle rule `expire-held-leads` (added by the step `Held enquiries expire`) deletes it. Nothing is logged except fixed words. Replay of held enquiries into `leads` is OPS-399 and must be live within 7 days of the first hold.

**Reading the count.** Claude in chat lists the objects under `held-leads/` by prefix (a count, never the content).

**Proof.** The step `Smoke lead hold` runs the staging self test first (the var `HOLD_SELFTEST` and the header `x-hold-selftest`, honoured on the exact staging host only): it holds a made-up enquiry without calling the app, reads it back, checks the token is absent and deletes it: `hold selftest: held yes, read back yes, token absent yes`, `hold selftest: deleted`. It then prints `pass-through: 400 invalid-json` on every target. The app reads the rate limit from the database before it reads the body, so while the database does not answer it cannot send that 400; only then, and only when `/api/health` names the database as failing, the step prints `pass-through: not proved, the app did not answer in 20 s and /api/health names the database as failing` instead of failing. Read that line as an open item, not a pass: run the step again once a database answers.

**Way back.** Revert the pull request and run `front-production` on `main` again (it redeploys the earlier front Worker with the live build id), or roll `mmg-law-firm-front` back to its previous version in Cloudflare.
