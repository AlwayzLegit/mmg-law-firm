# Moving mmg-lawfirm.com from Vercel to Cloudflare — zero-loss plan

_Drafted 2026-10-23 from the `main` checkout and the live Vercel project
(`mmg-law-firm`, team `alwayzlegits-projects`). Nothing here has been
executed; every step is reversible until the final DNS flip._

## 0. Where we are today

| Surface | Today | Moves? |
|---|---|---|
| Hosting / Next.js runtime | Vercel (Node 24, Next 16.2.6, Turbopack) | **Yes** → Cloudflare Workers via OpenNext |
| DNS | **Already on Cloudflare** (`greg` / `piper.ns.cloudflare.com`). `www` is a DNS-only CNAME to `*.vercel-dns-016.com`; apex has Vercel A records; apex 308-redirects to `www` at Vercel. | Records change; nameservers don't |
| Database / auth / storage | Supabase | No |
| Email | Resend | No |
| Bot protection | Cloudflare Turnstile | No (already Cloudflare) |
| Analytics | GA4 + PostHog | No |
| Errors | Sentry (`@sentry/nextjs`) | Re-wire server side |
| Crons | `vercel.json`: weekly digest, daily agenda, publish-scheduled | **Yes** → Worker Cron Triggers |
| Image optimization | Vercel `/_next/image` (AVIF/WebP, qualities 65/75, 30-day cache) | **Yes** → Cloudflare Images binding |
| Static assets | 18 MB in `public/` | Workers Static Assets |
| ISR / cache | 12 `revalidate` routes, 7 `generateStaticParams`, 39 `force-dynamic`, 218 `revalidatePath/Tag` calls | **Yes** → R2 + Durable Objects cache |

Nothing user-facing changes: same URLs, same redirects (next.config +
admin-managed), same CSP, same forms, same admin.

"No loss" means, concretely: no SEO loss (every URL, canonical, redirect,
sitemap and OG image identical), no lead loss (forms + email + Turnstile
keep working through the cutover), no downtime, no performance regression
(Lighthouse mobile stays ≥ 90 / CLS 0), no loss of observability (Sentry
+ CSP reports keep flowing), and a tested rollback.

## 1. Target architecture on Cloudflare

- **`@opennextjs/cloudflare`** builds the Next app into a single Worker
  (`workerd` + `nodejs_compat`). Pages, route handlers, `proxy.ts`
  (middleware), server actions, `after()`, OG-image routes all run in it.
- **Workers Static Assets** serve `public/` and `_next/static` from the edge.
- **R2 bucket** = ISR incremental cache (the HTML/RSC payloads).
- **Durable Object revalidation queue** + **D1 or DO tag cache** = what makes
  `revalidatePath` / `revalidateTag` (218 call sites in admin actions) work.
- **Cloudflare Images binding** = `/_next/image` optimization (AVIF/WebP,
  quality 65/75). Keeps the hero/LCP strategy and the `minimumCacheTTL`.
- **Cron Triggers** on the same Worker call the three `/api/cron/*` routes
  internally with `Authorization: Bearer CRON_SECRET`. The routes are already
  platform-neutral (`src/lib/cron/auth.ts`, header-only secret) and the
  schedules live in one registry (`src/lib/cron/schedules.ts`), so the
  Worker side is a few lines — see §1a.
- **Secrets** via `wrangler secret` (same names as today's Vercel env).
- **Sentry**: client side unchanged (`instrumentation-client.ts`); server
  side via `@sentry/cloudflare` `withSentry()` wrapping the Worker, with the
  same DSN. Source-map upload moves from the Vercel build to the CI build.

### 1a. Cron on Workers

`wrangler.jsonc` lists the same expressions as the registry (UTC on both
platforms):

```jsonc
{
  "triggers": { "crons": ["0 14 * * 1", "0 15 * * 1-5", "0 * * * *"] }
}
```

The Worker entry wraps OpenNext's handler and adds `scheduled()`, which maps
the fired expression back to its route and calls it with the bearer secret
(`CRON_SECRET` set with `wrangler secret put`):

```ts
// worker.ts
import handler from "./.open-next/worker.js";
import { jobForSchedule } from "./src/lib/cron/schedules";

export default {
  fetch: handler.fetch,
  async scheduled(event, env, ctx) {
    const job = jobForSchedule(event.cron);
    if (!job) return;
    ctx.waitUntil(
      handler.fetch(
        new Request(`${env.NEXT_PUBLIC_SITE_URL}${job.path}`, {
          method: "POST",
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        }),
        env,
        ctx,
      ),
    );
  },
} satisfies ExportedHandler;
```

Calling `handler.fetch` directly keeps the request inside the Worker (no
public round trip), and `wrangler dev --test-scheduled` plus
`curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"` exercises it
locally. Add a `schedules.test.ts` case that compares `wrangler.jsonc`
triggers to the registry, the same way `vercel.json` is checked today.

Plan tier: **Workers Paid ($5/mo)** is required — the Worker bundle for this
app (Sentry + MDX + recharts admin) will exceed the free 3 MB compressed
limit, and paid also lifts CPU time limits for the admin's heavier routes.
Images: budget the **Images** transformations line item (first 5k/month free
at time of writing — verify in the dashboard). R2/D1/DO usage will be in
the free allowance at this traffic.

## 1b. Spike results (2026-10-24, branch `infra/cloudflare-spike`)

Workstream A was run. Facts, not expectations:

| Question | Answer |
|---|---|
| Does the adapter support our Next version? | **Not 16.2.6.** `@opennextjs/cloudflare` 1.20.13 needs Next `>=16.4.1`. The branch upgrades Next, `eslint-config-next` and `@next/mdx` to **16.4.3**; typecheck, lint and tests pass after one test-helper fix (`PreparedImageConfig` gained `allSizes`/`output`). |
| Does the Worker build? | **Yes, on Linux.** `next build` (940 static pages) + OpenNext bundling completes in the CI job in ~2.5 min. On Windows the OpenNext step fails (`EPERM: symlink`) because it replicates pnpm's symlink layout; the adapter warns Windows is unsupported. Build on CI or WSL. |
| Turbopack or webpack? | **webpack for the Worker.** With Turbopack output, the Sentry instrumentation hook referenced a server chunk OpenNext didn't carry (`Not found server/chunks/[root-of-the-server]__….js`) and every request 500'd. `open-next.config.ts` sets `buildCommand: "pnpm exec next build --webpack"`; Vercel keeps Turbopack. |
| Does it serve under workerd? | **Yes.** `wrangler dev` (local R2 + Durable Objects, no account) answered 16 of 17 smoke routes exactly as production does: home, contact, practice hub and page, a city page, a guide, legal, sitemap, robots, llms.txt all 200; legacy `/car-accidents` 308 → practice page; `/admin` 307 → `/login?next=/admin`; `/login` 200; `/api/cron/*` 401 without the bearer; unknown path 404. `/blog` returned 404 only because CI has no Supabase secrets (nothing to list). |
| Do Cron Triggers work? | **Yes.** `wrangler dev --test-scheduled` + `/__scheduled?cron=0+*+*+*+*` invoked `cloudflare/worker.ts`'s `scheduled()`, which mapped the expression to `/api/cron/publish-scheduled` and called it in-process with the bearer (200). |
| Sentry? | The server hook loads under the webpack bundle (no errors in the Worker log). Server-side event delivery still needs `@sentry/cloudflare` wiring and a real DSN test in B. |
| Images, ISR invalidation, OG images | Not yet exercised: no Supabase data in CI, no Images binding configured. Covered in B. |
| Bundle size vs. the Workers limit | **4.76 MB gzipped** (25 MB raw) from `wrangler deploy --dry-run`. Over the 3 MB free limit, under the 10 MB paid limit: **Workers Paid is required**, as §1 assumed. The admin (recharts, MDX, Sentry) is most of it; splitting is possible later but not needed. |
| Security headers | The per-request CSP, HSTS and referrer policy from `proxy.ts` are emitted under workerd exactly as on Vercel. |

What the branch adds: `open-next.config.ts`, `wrangler.jsonc` (bindings, cron
triggers mirrored from `src/lib/cron/schedules.ts` with a test), `cloudflare/worker.ts`
(handler + `scheduled()`), `pnpm cf:build | cf:preview | cf:deploy`, and
`.github/workflows/cloudflare-spike.yml`, which rebuilds and smoke-tests the Worker
on every push to `infra/**`.

Next for B: add `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` as repository secrets so the
smoke run renders real data (the Lighthouse workflow wants the same two), then
extend the smoke list with `/blog`, a blog post, an OG image route and
`/_next/image?url=…`.

## 1c. Workstream B results (2026-10-24, branch `infra/cloudflare-parity`)

The CI smoke run now builds and serves with the **public Supabase keys**
(repository secrets `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY`, also used by the
Lighthouse job), so the Worker renders live content.

| Check | Result on the Worker |
|---|---|
| `/blog`, `/blog/dog-bite-lawyer-california` | 200 with real posts |
| Admin-managed redirect `/blog/…-5` (proxy.ts reads the `redirects` table live) | 308 to the original |
| `/sitemaps/car-accidents.xml` | 200 |
| OG image (`/opengraph-image`, resolved from the page's own tag) | 200, `image/png`, 255 KB — same as production (the per-route path 404s on production too) |
| `/_next/image?…portrait.webp&w=640&q=75` | First run: 200 but **pass-through** (166 KB for a 162 KB source — no resize). After adding `images: { binding: "IMAGES" }` to `wrangler.jsonc`: **91 KB WebP, resized**. Production needs Cloudflare Images enabled on the account for the binding to exist (first 5k transformations/month free at time of writing; verify in the dashboard). |
| Head parity vs production (title, canonical, meta description, og:image, JSON-LD block count, disclaimer count) on 7 pages: home, contact, practice page, city page, guide, blog post, privacy | **Identical on all 7** |
| Security headers | Per-request CSP, HSTS from `proxy.ts`; `Cache-Control: s-maxage=3589, stale-while-revalidate` on ISR pages |
| Deployable bundle | 4.81 MB gzipped (Workers Paid) |

Still open for B: ISR invalidation from an admin edit (needs a signed-in
session; do it on the staging subdomain in C), Sentry server events, and the
image optimizer. Everything else in the B checklist is covered by the
workflow and passes.

## 2. Workstreams

### A. Build compatibility spike (1–2 days, no production impact)

1. Branch `infra/cloudflare`. Add `@opennextjs/cloudflare` + `wrangler`;
   create `wrangler.jsonc` and `open-next.config.ts` (R2 incremental cache,
   DO queue, D1 tag cache, Images loader).
2. `pnpm build` → `opennextjs-cloudflare build` → `wrangler dev`. Fix
   whatever breaks. Known things to verify on this exact codebase:
   - Next **16.2.6** is supported by the current OpenNext release
     (`proxy.ts` on the Node runtime, `globalNotFound`, `after()`).
   - The seven `opengraph-image.tsx` routes (`next/og` / satori WASM).
   - `@next/mdx` + remark/rehype in the Worker bundle.
   - `@sentry/nextjs` server init in `instrumentation.ts` — expect to swap
     the server half for `@sentry/cloudflare`.
   - `libphonenumber-js`, `resend`, `@supabase/ssr` under `nodejs_compat`
     (all expected fine).
   - Bundle size after tree-shaking (`wrangler deploy --dry-run --outdir`).
3. Deploy to `mmg-law-firm.<account>.workers.dev` with **preview** Supabase
   keys and `NEXT_PUBLIC_SITE_URL=https://www.mmg-lawfirm.com` (so canonicals
   still point at prod). Add a Cloudflare response-header rule
   `X-Robots-Tag: noindex` for the workers.dev host.

### B. Parity verification (2–3 days, on the workers.dev deploy)

Run the same checks the Oct 13 QA pass used (`docs/qa-handoff-browser.md`):

- Crawl all ~93 public URLs + `/sitemap.xml` + `/sitemaps/*` + `/robots.txt`
  + `/llms.txt`: 200s, identical `<title>`, canonical, meta description,
  JSON-LD, OG image URLs. Diff against the Vercel production responses
  (script: fetch both, compare normalized HTML head).
- Every `next.config` redirect (9 legacy Squarespace paths) and a sample of
  admin-managed redirects → correct 301/308 target.
- Lead form end-to-end with Turnstile (add the workers.dev + staging
  hostnames in the Turnstile widget settings first).
- Admin: sign in, invite flow, content edit → `revalidatePath` → public page
  updates within seconds (this is the ISR tag-cache test).
- Crons: trigger each `/api/cron/*` manually with the bearer secret.
- Sentry: throw a test error on server + client, see both events.
- Lighthouse mobile on home, a practice hub, a city×practice page, a guide:
  perf ≥ 90, CLS 0, SEO 100. Compare TTFB cold vs warm with Vercel.
- Image checks: `/_next/image?url=…&w=…&q=65` returns AVIF to Chrome, WebP
  to Safari, with long cache headers.

### C. Staging on the real domain (half a day)

Account state on 2026-10-24 (account `fb8683be6eab7014c9835bd0834a7999`,
zone `mmg-lawfirm.com` id `b3dea43809a3d1e1eeefb70df4e433af`, Free plan):

- [x] Workers Paid and R2 Paid are already active; an Images subscription
      exists (the `IMAGES` binding needs nothing more).
- [x] R2 bucket `mmg-law-firm-cache` created.
- [x] Turnstile widget "Mmg Law Firm Captcha" (`0x4AAAAAADoV9nhefGrITBfM`)
      allow-lists `staging.mmg-lawfirm.com` and
      `mmg-law-firm.jetnine-inc.workers.dev` alongside the production hosts.
- [x] Repo secret `CLOUDFLARE_ACCOUNT_ID` set.
- [x] **API token** `mmg-law-firm GitHub Actions deploy` created
      2026-10-24 (owner clicked Create on a pre-filled form), stored as
      `CLOUDFLARE_API_TOKEN`. Scopes, for a future rotation (dash → My
      Profile → API Tokens → Create Token → Custom):
      Account `Jetnine.inc@gmail.com's Account`: Workers Scripts **Edit**,
      Workers R2 Storage **Edit**, Workers KV Storage **Edit**, Queues
      **Edit**, Workers Observability **Edit**, Workers Tail **Read**,
      Account Settings **Read**, Images **Edit**. Zone `mmg-lawfirm.com`
      only: Workers Routes **Edit**, DNS **Edit**, SSL and Certificates
      **Edit**, Zone **Read**, Zone Settings **Read**. User: User Details
      **Read**, Memberships **Read**. Put the value in `.env.local` as
      `CLOUDFLARE_API_TOKEN=…`.
- [x] **Repo secrets** (11): Cloudflare token + account id, Supabase (3),
      Resend from/notify addresses, Turnstile site + secret key, and
      generated `CRON_SECRET` / `REVALIDATE_SECRET` (also appended to
      `.env.local` by `pnpm github-secrets`).
- [x] **All Vercel production secrets imported** 2026-10-25 by the in-build
      sync (`DEPLOY.md` §6e): 19/19 keys into both GitHub environments
      `cloudflare-production` and `cloudflare-staging`, including
      `RESEND_API_KEY`, `ADMIN_API_KEY`, Sentry, GA and PostHog. The
      temporary `SYNC_SECRETS_GITHUB_TOKEN` was deleted from Vercel the
      same hour. Not on Vercel, so still absent: `RESEND_WEBHOOK_SECRET`,
      `CONTENT_NOTIFY_EMAIL`, `SENTRY_AUTH_TOKEN`,
      `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, Twilio (3). The next staging
      deploy will send email.
- [x] **First staging deploy** 2026-10-24 (run 40120282302, 4m27s):
      `https://mmg-law-firm.jetnine-inc.workers.dev`. Smoke by hand: `/`,
      `/contact`, `/hy`, `/ru/contact`, practice hub, guide, `/blog`,
      `/sitemap.xml`, `/robots.txt` → 200 with the right content types;
      `/admin` → 307 to `/login`; `/api/cron/*` → 401 without the bearer and
      200 with the Worker's `CRON_SECRET`; `/_next/image` → WebP 87 KB via the
      Images binding; `X-Robots-Tag: noindex, nofollow` and the full CSP on
      every page; ISR `x-opennext-cache: HIT` on repeat requests.
      Head parity vs production identical on 7 pages (title, description,
      canonical modulo origin, robots, JSON-LD count).
      *Wrangler prints "no such Durable Object class is exported" for
      `DOQueueHandler` / `DOShardedTagCache` at upload. False alarm from its
      static check on the `export … from` re-export in `cloudflare/worker.ts`:
      the tag-cache namespace held live objects minutes after deploy and the
      cache hits. Ignore unless a future wrangler turns it into an error.*
- [x] **Custom domain** `staging.mmg-lawfirm.com` attached 2026-10-24 after a
      redeploy carrying the production-origin noindex guard (run
      40124402122; the workflow's own smoke now resolves the workers.dev
      URL and passes). Cloudflare created the proxied record; cert from
      Google Trust Services, valid to 2027-01-14. Serving within a minute:
      `/`, `/contact`, `/hy`, `/ru/contact`, practice hub, `/blog`,
      sitemap, robots → 200; `/admin` → 307 login; cron → 401;
      `X-Robots-Tag: noindex, nofollow`; ISR HIT. Production
      (`www`) still answers from Vercel, untouched. The host stays `noindex` automatically (host ≠
      `NEXT_PUBLIC_SITE_URL`'s host is enough for the proxy guard; staging's
      `site_url` is the staging host itself, so the guard keys off the
      canonical production host — see `src/lib/seo/host-guard.ts`).
- [x] **Staging split off** 2026-10-24: the first deploys put staging on the
      `mmg-law-firm` Worker *with* the four cron triggers and a
      `CRON_SECRET`, i.e. a second scheduler on the production database.
      Caught within the hour; schedules removed by API; verified no lead
      stamped and nothing published in the meantime. Now staging is its own
      Worker (`wrangler --env staging` → `mmg-law-firm-staging`, bucket
      `mmg-law-firm-cache-staging`, `triggers.crons: []` pinned by
      `src/lib/cron/schedules.test.ts`), and every Worker's `scheduled()`
      no-ops unless `CRON_ENABLED=1`. The build now also receives the
      `NEXT_PUBLIC_*` keys it inlines (the first staging build had no
      Turnstile site key, so the form showed "verification unavailable").
- [ ] Staging points at **production** Supabase (read paths only for the QA
      pass; use a throwaway lead to test the form once `RESEND_API_KEY` is
      set, and mark it spam afterwards).
- [x] Parity crawl against `staging.mmg-lawfirm.com` 2026-10-24: title,
      description, canonical (modulo origin), robots and JSON-LD count
      identical to production on 9 pages (home, contact, car hub, a guide,
      Glendale, blog, attorney bio, `/hy`, `/ru/contact`). Go for
      cutover planning (§D) once `RESEND_API_KEY` is on the Worker and a
      throwaway lead has gone through staging end to end.

### D. Cutover (≈1 hour, low traffic window, e.g. Tuesday 6 am PT)

Two Workers since 2026-10-24: `mmg-law-firm-staging` (staging.mmg-lawfirm.com,
no crons) and `mmg-law-firm` (production, nothing routed to it yet). Both
read and write the same Supabase project, which is why only one scheduler
may ever be on: Vercel Cron until cutover step 4, the production Worker
after.

**Day before**

1. ~~Production secrets into the GitHub environment `cloudflare-production`~~
   **Done 2026-10-25** (§C): the in-build sync copied all 19 Vercel values
   into both environments. Re-run it (`DEPLOY.md` §6e) only if a value is
   rotated on Vercel before cutover. Anything not on Vercel falls back to
   the repository secret of the same name (e.g. `CLOUDFLARE_API_TOKEN`).
   Still to do here: add a required reviewer to `cloudflare-production`
   (repo → Settings → Environments) so a production deploy always needs a
   click.
2. Run **Cloudflare deploy** with `target=production`, `cron_enabled`
   unchecked. It uploads `mmg-law-firm` with the production site URL and
   analytics keys and smokes its workers.dev URL. No traffic moves.
3. `pnpm parity https://www.mmg-lawfirm.com https://mmg-law-firm.jetnine-inc.workers.dev`
   → every page SAME (the workers.dev host is noindex by design).
4. Tell the team: no admin content edits during the window.

**Cutover**

1. Cloudflare DNS: set the `www` and apex records' TTL to 60 s; wait out the
   old TTL.
2. Workers & Pages → `mmg-law-firm` → Domains → Add Domain →
   `www.mmg-lawfirm.com`. Cloudflare asks to replace the existing CNAME to
   Vercel: confirm. **This is the switch.** Repeat for `mmg-lawfirm.com`
   (replaces the two A records). Certs issue in about a minute (staging
   took under 60 s). The app itself 308s apex → www (`apexRedirect` in
   `src/lib/seo/host-guard.ts`).
3. Watch 10 minutes: Workers → mmg-law-firm → Observability for 5xx, Sentry
   for new errors; a HEAD request to `https://www.mmg-lawfirm.com/` shows
   `server: cloudflare` and no `x-robots-tag`; submit one test lead and mark
   it spam; open `/admin`.
4. **Schedulers:** Vercel → Project → Settings → Cron Jobs → Disable (Vercel
   Cron calls its deployment directly, so it keeps firing after DNS moves).
   Then run **Cloudflare deploy** again with `target=production` and
   `cron_enabled` checked. At the next quarter hour, confirm one
   `/api/cron/sla-alerts` invocation in the Worker logs.
5. `pnpm parity https://www.mmg-lawfirm.com https://staging.mmg-lawfirm.com`
   (both on Cloudflare now) and resubmit the sitemap in Search Console.

### E. Rollback (any time in the first 30 days)

Remove the `www` and apex custom domains from the `mmg-law-firm` Worker,
recreate the Vercel records (kept in this doc's appendix), and re-enable
Vercel Cron *after* redeploying the Worker with `cron_enabled` unchecked —
propagation is ~1 minute at 60 s TTL. Keep the Vercel
project and its env vars untouched for 30 days; do not delete it until the
Cloudflare crons, ISR and image cache have run through a full month.

### F. After the dust settles

- Remove `vercel.json`; remove `va.vercel-scripts.com` /
  `vitals.vercel-insights.com` from the CSP in `src/proxy.ts`.
- Update `DEPLOY.md` §6 for Workers (`wrangler deploy` from GitHub Actions
  on push to `main`, preview deploys per PR via `wrangler versions upload`).
- Turn on Cloudflare's own protections now that traffic is proxied: WAF
  managed rules, rate limiting on `/api/leads` (keeps the app-level limiter
  as the second layer), Bot Fight Mode off for `challenges.cloudflare.com`.
- Cancel Vercel Pro after the 30-day hold.

## 3. Risks and how each is closed

| Risk | Mitigation |
|---|---|
| OpenNext lags Next 16.x | Spike first (A). If blocked, pin Next to the last supported minor on the infra branch only; `main` keeps moving. |
| ISR behaves differently (stale admin edits) | Tag cache + queue configured in A; explicit test in B; `revalidatePath` is the only invalidation path used, so one test covers the pattern. |
| `/_next/image` output or cost differs | **Closed in code:** the `IMAGES` binding is configured and the smoke run shows resized output. Remaining: enable Cloudflare Images on the account (billing line item) so the binding exists in production, then compare Lighthouse on staging. |
| OG images break | Seven routes tested in B; worst case they pre-render to static files at build. |
| Sentry gap during cutover | Client side is unaffected; server side wired in A and smoke-tested in B before DNS changes. |
| DNS/cert hiccup | Custom domains + certs provisioned the day before; TTL 60 s; rollback is one record edit. |
| Turnstile rejects on the new host | Hostnames added to the widget before B. |
| Email deliverability | Unchanged (Resend, same DKIM/SPF); verify one lead notification in B and at cutover. |
| Crons silently stop | Cron Triggers + `CRON_SECRET` set in D; each route is fired manually in B. |
| Lost Vercel-only features | None used: no `@vercel/*` packages, no Edge Config, no Vercel Analytics/Speed Insights, no Blob. |

## 4. Effort

| Step | Time |
|---|---|
| A. Spike + config | 1–2 days |
| B. Parity QA | 2–3 days |
| C. Staging on domain | 0.5 day |
| D. Cutover | 1 hour + a day of watching |
| E/F. Cleanup | 0.5 day after 30 days |

Total ≈ one working week before the flip, with production untouched until D.

## Appendix — current DNS values to keep for rollback

```
www.mmg-lawfirm.com   CNAME  4d71964fe9222fc4.vercel-dns-016.com   (DNS only)
mmg-lawfirm.com       A      216.150.1.193                         (DNS only)
mmg-lawfirm.com       A      216.150.16.193                        (DNS only)
Apex → www: 308 at Vercel (project domain redirect)
```
