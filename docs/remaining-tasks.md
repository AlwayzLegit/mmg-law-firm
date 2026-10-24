# Remaining tasks

Living checklist of what is still open after the October 2026 build sprint
(PRs #160–#175). Tick items here as they close; the "code" column says
whether it is engineering work or something only the firm can do.

## Attorney review (blocks publishing, not deploys)

- [ ] **Armenian and Russian pages** — review `src/lib/i18n/dictionaries/hy.ts`
      and `ru.ts` (landing + contact copy, form labels, TCPA consent wording,
      "Attorney Advertising" label). Live in review mode at
      `/hy`, `/hy/contact`, `/ru`, `/ru/contact` (noindex, unlisted). After
      sign-off set `NEXT_PUBLIC_LOCALE_PAGES_LIVE=1` on Vercel production and
      redeploy; that turns on indexing, hreflang, sitemap entries and the
      language links. *(code: none)*
- [ ] **Statute-of-limitations rules** — confirm the four headline deadlines
      in `src/lib/leads/limitations.ts` (PI 2y, public-entity claim 6mo,
      FEHA 3y, wage 3y) and the 60-days-before reminder task. They drive the
      Deadline card on each lead, the Today page section and the agenda
      email. *(code: edit the constants if any rule changes)*
- [ ] **Practice-area and guide copy** — ~60 `TODO(human): attorney review
      required` markers across `src/lib/data/practice-area-content.ts`,
      `local-faq.ts`, and the v3 page bodies. *(code: none)*
- [ ] **Privacy / disclaimer pages** — spec §18 asks for attorney review
      before relying on them. *(code: none)*

## Firm-side (data and accounts)

- [ ] Call back the five leads still in "new" (6–49 days as of 2026-10-24).
      The Today queue now has tap-to-call and Called/Voicemail buttons; the
      15-minute breach alert has already fired once for each.
- [ ] Twilio: credentials on Vercel (`TWILIO_ACCOUNT_SID`,
      `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) and 10DLC registration.
      Until then the SMS leg of the new-lead notify and the breach alert
      no-ops; email still goes out.
- [ ] Cloudflare (workstream C in `docs/cloudflare-migration-plan.md` has
      the exact state). Done 2026-10-24: account prepared, API token and
      11 repo secrets in place, first staging deploy live and smoked at
      `https://mmg-law-firm.jetnine-inc.workers.dev`, head parity identical
      on 7 pages. **Owner, two things:** (1) Workers & Pages → mmg-law-firm
      → Domains → Add Domain → `staging.mmg-lawfirm.com` (DNS changes are
      reserved for you); (2) add `RESEND_API_KEY` to `.env.local` and run
      `pnpm github-secrets`, then re-run the deploy workflow so staging can
      send email. Then: parity crawl on the staging host, cut over (§D),
      30-day rollback hold.
- [ ] Spec §18 open questions: real headshot, bar admission date and law
      school, Avvo / Justia / LinkedIn URLs for `sameAs`, firm founding year,
      existing case results to seed, Spanish intake (yes/no — decides whether
      the `es` dictionary gets routes).
- [ ] Content agent: still publishes directly with the legacy shared
      `ADMIN_API_KEY` (owner has a separate plan; leave as is).

## Engineering backlog (not started)

- [ ] Localize the lead form's field-level validation messages (Zod schema
      currently returns English on `/hy` and `/ru`).
- [ ] Analytics: median days from lead to signed per channel (leads vs
      signed per channel already exists).
- [ ] Cloudflare: after cutover, remove `vercel.json`, drop the Vercel
      hosts from the CSP in `src/proxy.ts`, update `DEPLOY.md` §6, enable
      WAF / rate limiting at the edge.
- [ ] Doc drift: `docs/cloudflare-migration-plan.md` §D still says
      `CRON_SECRET` is unset on Vercel; it has been set since PR #164.

## Done in this sprint (for reference)

Hero DPR fix · auth streamlining (token-hash links, bootstrap-owner) ·
Cloudflare plan + spike + parity (Next 16.4.3, OpenNext, Images binding,
deploy workflow) · cron registry + `CRON_SECRET` · admin v3 restyle ·
speed-to-lead (Today queue, SLA stats, attribution, agenda email, 15-minute
breach alert, one-tap first response) · admin QA rounds 1–2 + audit RLS
fix · blog dedupe (53 copies) · intake deadlines + checklist · Armenian /
Russian pages (review mode). Migrations applied through 0038.
