# Browser QA Handoff — MMG Law Firm

> A complete pre-production browser QA pass. Designed for a tester (human or
> a browser-driving agent) who has **no prior context** on the codebase.
> Production URL: **`https://mmg-lawfirm.com`** (Domain GSC property covers
> both apex + www; load whichever your browser uses).

## How to run this

1. **Test from a fresh incognito window**, ad-blockers disabled (otherwise GA4
   / PostHog network checks fail even when they're working in production).
2. **Use a real mobile viewport at least once** — Chrome DevTools → device
   toolbar → iPhone 14 (375 × 812). The mobile-CTA bar and sticky elements only
   show below `lg`.
3. **Record each result as PASS / FAIL / N/A** with a screenshot for any FAIL.
4. **Do not submit the live lead form with fake data.** Use the noted test
   path — there are real Twilio + Resend notifications wired.
5. Pages list to spot-check is in §6 — you don't need to load all 650, just
   the representatives.

---

## 1. Smoke (5 minutes)

| # | Step | Expected |
|---|---|---|
| 1.1 | Load `/` | 200, no console errors, no layout shift on hero image |
| 1.2 | View-source `/` | `<meta name="google-site-verification" …>` absent (Domain property — verification is DNS-based; meta unset on purpose) |
| 1.3 | View-source `/` | `<script … gtag/js?id=G-XTQTZ6YCMG …>` present |
| 1.4 | DevTools → Network → filter "posthog" | A `decide` or `e?ver=` request fires within 5s |
| 1.5 | Click skip-link (Tab from very top) | "Skip to main content" appears, focuses `#main-content` on Enter |
| 1.6 | Open `/sitemap.xml` | Returns XML listing ~650 URLs |
| 1.7 | Open `/robots.txt` | Allows everything except `/admin`, `/api`, `/login`; references sitemap |
| 1.8 | DevTools → Lighthouse → Mobile → all categories | Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO 100 |

## 2. Header / Footer / global chrome

| # | Step | Expected |
|---|---|---|
| 2.1 | Phone link in header on mobile | `tel:+1818…` opens dialer |
| 2.2 | Click logo on a sub-page | Returns to `/` |
| 2.3 | Header nav: click "Practice Areas" / "Locations" | Each is a direct link to its index page (no hover dropdown — this design uses flat top-nav by spec) |
| 2.4 | Footer | Contains firm name + Glendale address + phone + email + the 4 CRPC disclaimers (general, results, testimonial, advertising) |
| 2.5 | Resize to mobile (375px) | Sticky mobile CTA bar appears at bottom with phone + "Free consult" buttons |
| 2.6 | Tab through header | Visible focus rings; no keyboard trap |

## 3. Blog — *just rebuilt, scrutinize this*

### 3a. Listing (`/blog`)

| # | Step | Expected |
|---|---|---|
| 3.1 | Load `/blog` | **Featured card** at top showing hero image + title + excerpt; rest in 3-col grid below (1-col on mobile) |
| 3.2 | Every card shows a hero image | If a post has no `hero_image_url`, falls back to gradient + "MMG" mark — *not* a broken image |
| 3.3 | Hover any card (desktop) | Card lifts slightly, image scales subtly, no layout shift |
| 3.4 | Tab through cards | Each card is a single focusable link; visible focus ring |
| 3.5 | Click a card | Navigates to the post; back button returns to listing |

### 3b. Single post (`/blog/<slug>`)

| # | Step | Expected |
|---|---|---|
| 3.6 | Load any post | Breadcrumbs · category tag · headline · subtitle · author · date · "X min read" · hero image below |
| 3.7 | Below md viewport | Sidebar (TOC, Author card, Share, Related) stacks below the article body |
| 3.8 | At lg+ viewport | Sidebar sits to the right and **sticks** as you scroll |
| 3.9 | "In this article" TOC | Lists every H2/H3 in the body |
| 3.10 | Click a TOC item | Smooth scroll to that heading; heading is offset from top by the sticky header (no overlap) |
| 3.11 | Click any heading | URL updates to `…#heading-slug` (rehype-autolink-headings) |
| 3.12 | "Written by" card → "Free consultation" | Navigates to `/contact?utm_source=blog&utm_medium=sidebar…` |
| 3.13 | Share buttons | X opens `twitter.com/intent/tweet`; LinkedIn opens share-offsite; mail opens default mailer with URL prefilled; copy-link button → "Link copied." toast + check icon for 1.5s |
| 3.14 | Related-reading sidebar | Up to 3 other posts, never the current one |
| 3.15 | Tags chip row | All post tags listed; capitalize-style display |
| 3.16 | Bottom footer card | "Need to talk through your case?" with phone + contact link |
| 3.17 | View-source | `<script type="application/ld+json">` with `@type":"Article"` present |

## 4. Practice areas

Load `/practice-areas` and at least three slugs from this list (one injury, the
new catastrophic-injury, one employment):

`/practice-areas/car-accidents` · `/practice-areas/catastrophic-injury` ·
`/practice-areas/employment-law` · `/practice-areas/wrongful-termination`

| # | Step | Expected |
|---|---|---|
| 4.1 | `/practice-areas` index | 15 cards (10 injury + 5 employment sub-niches), each links to its hub |
| 4.2 | Any hub page | Hero · intro · "How {attorney} helps with X" section · subtopics · process · what-to-do · compensation block · deadlines callout · FAQs · CTA band · lead form |
| 4.3 | Employment hubs | "Compensation" reads back-pay/front-pay/penalties (NOT medical bills); "Deadlines" mentions CRD/FEHA + Labor Code (NOT CCP §335.1) |
| 4.4 | FAQ items | Click to expand; only one open at a time (or per design — confirm intent); JSON-LD includes FAQPage schema (view-source) |

## 5. Locations — the SEO money pages

Pick at least one URL from each of these tiers:

- County: `/locations/los-angeles-county` · `/locations/orange-county` · `/locations/kern-county`
- City: `/locations/los-angeles-county/glendale` · `/locations/orange-county/santa-ana`
- **City × practice (the real money pages):**
  `/locations/los-angeles-county/los-angeles/car-accidents` ·
  `/locations/orange-county/santa-ana/wrongful-termination` ·
  `/locations/san-diego-county/san-diego/rideshare-accidents`

| # | Step | Expected |
|---|---|---|
| 5.1 | Any county page | Unique intro (not boilerplate); mentions real freeways/courts; CTA band; embedded lead form |
| 5.2 | Any city × practice page | Local angle copy is page-specific (different on each); meta description ≤160 chars; canonical URL ends in `…/<county>/<city>/<practice>` |
| 5.3 | Phone CTA on a city × practice | Tapping fires a PostHog `phone_click` event (DevTools → Network → filter "i.posthog" → look for `e?ver=` POST including `phone_click`) |

## 6. Contact + lead form

Lead form lives on `/contact` and as a compact embed on every practice + city
page. **Use this test path** (don't fake a real-looking lead):

| # | Step | Expected |
|---|---|---|
| 6.1 | Load `/contact` | Form has Name, Phone, Email, Practice area, County/City selectors, Description, TCPA consent checkbox (unchecked), Turnstile widget |
| 6.2 | TCPA checkbox label | Matches the verbatim text from `lib/constants.ts → TCPA_CONSENT_TEXT` (autodialer, msg+data rates, STOP) |
| 6.3 | Submit empty | Field-level errors; first error is announced (`role="alert"`); no submit |
| 6.4 | **Submit a TEST lead** with: Name = "QA Test", phone = your own +1 phone, brief description "QA smoke test — please disregard" | Toast "We received your request — we'll be in touch shortly." within ~3s |
| 6.5 | Check `info@mmg-lawfirm.com` (or `LEAD_NOTIFY_EMAIL` recipient) | Notification email arrives with the lead summary within ~30s |
| 6.6 | Open admin → `/admin/leads` | New row at top, status=`new`, your test name visible |
| 6.7 | Open that lead's detail | TCPA consent snapshot card shows "Yes" + timestamp + IP |
| 6.8 | Delete the test lead | (Optional cleanup) — set status=`spam` or use admin actions |

If Turnstile doesn't render: ad-blocker is on, or `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset on the deployment. The server-side check is fail-closed in production (intentional).

## 7. Admin

Log in via magic link at `/login` with an email that exists in
`admin_profiles`. First-time login bounces through `/onboarding` to set a
password — then later sessions sign in via email + password.

| # | Step | Expected |
|---|---|---|
| 7.1 | `/login` | Email field; sending an unknown email returns a generic "check your inbox" (no email enumeration) |
| 7.2 | After verifying a device, hit `⌘K` | Command palette opens; type "today" → "Today" appears; Enter goes there |
| 7.3 | `/admin` dashboard | KPIs, "Needs attention" cards, leads chart, recent activity. No 0-state errors |
| 7.4 | `/admin/today` | Overdue / due-today / upcoming task buckets; Follow-ups due; New & unassigned. Adding a task works |
| 7.5 | `/admin/leads` | Filter chips, bulk-select rows, "Mark reviewed" / Publish / Unpublish are visible when ≥1 row selected |
| 7.6 | Open a lead | Communications card supports channel toggle (SMS / Email); template picker populates from `/admin/settings/templates` |
| 7.7 | Send a test outbound SMS *to yourself only* | Logged in the thread as "Sent → delivered" within ~30s (Twilio status webhook). If still "Sent" after 2 min, check `TWILIO_*` env + 10DLC registration |
| 7.8 | Send a test outbound email to yourself | Logged as "Sent → delivered" → "Opened" after you open it (Resend webhook) |
| 7.9 | `/admin/analytics` | KPIs, lead source breakdown, **Conversion & ROI** (Leads · Signed · Rate per dimension), Monthly trend (12-mo bars), Website traffic from PostHog, Visitor funnel, Recent activity |
| 7.10 | `/admin/seo` | Content-health panel; ideally "All clear" (0 issues) given the recent audit |
| 7.11 | `/admin/content/blog/[id]` (any post) | Right sidebar shows **History** card listing audit events |
| 7.12 | `/admin/settings/templates` | List of 5 seed templates; can create / edit / disable / delete; the lead Communications panel picks up changes live |
| 7.13 | `/admin/settings` → Communications | Link to message templates present |
| 7.14 | Sign out | Returns to `/login`; protected routes redirect |
| 7.15 | (Owner only) `/admin/audit` | Audit log table with recent events |

## 8. Public admin API

Run from a terminal with `ADMIN_API_KEY` from Vercel:

```bash
KEY="<the admin api key>"
# 1. 401 without auth
curl -sw "\n%{http_code}\n" https://mmg-lawfirm.com/api/admin/taxonomy
# 2. 200 with auth
curl -sw "\n%{http_code}\n" https://mmg-lawfirm.com/api/admin/taxonomy \
  -H "Authorization: Bearer $KEY" | head -c 200
# 3. list blog
curl -sw "\n%{http_code}\n" https://mmg-lawfirm.com/api/admin/blog?limit=2 \
  -H "Authorization: Bearer $KEY" | head -c 300
# 4. upload an image from URL
curl -sw "\n%{http_code}\n" -X POST https://mmg-lawfirm.com/api/admin/images \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"url":"https://picsum.photos/1200/630","filename":"qa-smoke"}'
```

Expect: `401`, `200 {practice_areas:[…], counties:[…]}`, `200 {posts:[…]}`,
`201 {image:{url,name}}`.

## 9. Analytics integration sanity

| # | Step | Expected |
|---|---|---|
| 9.1 | Load any page → wait 30s → GA4 **Reports → Realtime** | "1 user in the last 30 minutes" present |
| 9.2 | Load any page → DevTools → Network → filter `i.posthog` | A `decide` POST + an `e?ver=` POST with event `$pageview` |
| 9.3 | Click a `tel:` link → Network | `e?ver=` POST with event `phone_click` |
| 9.4 | Open lead form, focus a field → Network | `e?ver=` POST with `lead_form_started` |
| 9.5 | GSC → URL Inspection on `/` | Status: URL is on Google (after first crawl); coverage clean |

## 10. SEO sanity

| # | Step | Expected |
|---|---|---|
| 10.1 | View-source on `/` | Single `<link rel="canonical">`; OG tags; Twitter tags; JSON-LD with `@type":"LegalService"` |
| 10.2 | View-source on a blog post | `<link rel="canonical" href="https://…/blog/<slug>">`; Article schema; BreadcrumbList schema |
| 10.3 | View-source on a city × practice page | LegalService schema with `knowsAbout`; BreadcrumbList schema |
| 10.4 | Open Google's [Rich Results Test](https://search.google.com/test/rich-results) and run a blog post URL | "Article" detected; no errors |
| 10.5 | Same tool, a city × practice URL | "LegalService" detected; no errors |

## 11. Legal / compliance

| # | Step | Expected |
|---|---|---|
| 11.1 | Footer on every page | "Attorney Advertising" badge + 4 disclaimers (general, results, testimonial, advertising) |
| 11.2 | Any city × practice page | No invented case results; no guarantee language ("we'll win", "best", "#1"); no fake testimonials |
| 11.3 | `/case-results` | Empty state (until real settlements are seeded), not invented data |
| 11.4 | `/reviews` | Empty state (until real testimonials are seeded) |
| 11.5 | TCPA checkbox | **Unchecked by default**; submitting without checking blocks |

## 12. Edge cases

| # | Step | Expected |
|---|---|---|
| 12.1 | Load a slug that doesn't exist `/blog/this-doesnt-exist` | Custom 404 |
| 12.2 | Trigger an error (open the dev-tools and `throw` in console — sanity only) | `/error` boundary renders gracefully |
| 12.3 | Submit lead form rapidly 6×+ from same IP | After 5/hr the API returns 429; UI toasts "You've sent several requests…" |
| 12.4 | Visit `/admin` unauthenticated | Redirects to `/login` |
| 12.5 | `/admin/media` while unauthenticated (used to be a gap) | Redirects to `/login` (NOT 200 with data) |

## 13. Mobile-only spot checks

| # | Step | Expected |
|---|---|---|
| 13.1 | Tap the hamburger / mobile menu | Slides in; close on backdrop tap |
| 13.2 | Sticky mobile CTA at bottom | Always visible on public pages; doesn't obscure form submit |
| 13.3 | Lead form select dropdowns | Native picker on iOS; works without keyboard |
| 13.4 | Mobile blog post | Hero image not full-bleed cut; TOC sidebar appears below content |
| 13.5 | Mobile font scaling at 200% browser zoom | Layout doesn't break; no horizontal scroll |

---

## What "PASS" looks like overall

✅ Smoke ✅ All blog improvements visible ✅ Lead form delivers (email + admin row) ✅ Admin reachable + comms + analytics populated ✅ API responds ✅ Lighthouse hits §12 targets ✅ Schema validates ✅ No CRPC compliance issues found

## What gets flagged for follow-up

🔴 Any FAIL with screenshot + page URL + console snippet → file as a row in
`docs/qa-findings.md` so the dev (me) can triage. Severity: P0 (broken /
compliance) > P1 (UX regression / SEO impact) > P2 (polish).
