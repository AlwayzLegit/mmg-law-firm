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

1. Cloudflare DNS: add `staging.mmg-lawfirm.com` → Worker custom domain,
   proxied. Keep `X-Robots-Tag: noindex` on it.
2. Point staging at **production** Supabase + Resend (read paths only for
   the QA pass; use a throwaway lead to test the form).
3. Re-run the parity crawl against staging. This is the final go/no-go.

### D. Cutover (≈1 hour, low traffic window, e.g. Tuesday 6 am PT)

Pre-work the day before:

- Lower TTLs on `www` and apex to 60 s (they're already on Cloudflare DNS).
- Add `www.mmg-lawfirm.com` and `mmg-lawfirm.com` as Custom Domains on the
  Worker (Cloudflare issues the certs ahead of time).
- Set all production secrets on the Worker. Copy every key from Vercel's
  list: Supabase (3), Resend (2), Turnstile (2), PostHog (4), Sentry (3),
  GA, Site URL, `REVALIDATE_SECRET`, `ADMIN_API_KEY`. **Also set
  `CRON_SECRET`** — it is not set on Vercel today, so the three crons are
  returning `503 cron-not-configured` in production right now.
- Freeze admin content edits for the window (tell the team).

Cutover:

1. Switch `www` CNAME from `*.vercel-dns-016.com` to the Worker (proxied) and
   replace the apex A records with the Worker custom domain (proxied).
   Apex → `www` 308 moves to a Cloudflare Bulk Redirect (or a Worker route).
2. Watch for 10 minutes: Cloudflare analytics for 5xx, Sentry for new
   errors, submit one test lead, open `/admin`.
3. Re-run the parity crawl against the live domain.
4. Submit the sitemap in Search Console (same URL; just a re-ping).

### E. Rollback (any time in the first 30 days)

Flip the `www` CNAME and apex A records back to the Vercel values (kept in
this doc's appendix) — propagation is ~1 minute at 60 s TTL. Keep the Vercel
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
