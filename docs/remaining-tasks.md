# Remaining tasks

Living checklist of what is still open after the October 2026 build sprint
(PRs #160–#175). Tick items here as they close; the "code" column says
whether it is engineering work or something only the firm can do.

## Attorney review (blocks publishing, not deploys)

- [ ] **Armenian, Russian and Spanish pages — PUBLISHED before attorney
      review.** On 2026-10-25 the owner (AlwayzLegit) chose to publish all
      three before Mihran's sign-off and accepted the risk.
      `NEXT_PUBLIC_LOCALE_PAGES_LIVE=1` is set on Vercel production and as a
      GitHub repository variable (Cloudflare builds read it), so `/hy`,
      `/ru`, `/es` and their `/contact` pages are indexable, in the sitemap,
      cross-linked with hreflang and in the language menus. **Still needed:**
      Mihran reviews `src/lib/i18n/dictionaries/hy.ts`, `ru.ts`, `es.ts`
      (the review packet lists every line); any change ships as a normal
      code change. To pull the pages back, set the variable to `0` (or
      delete it) and redeploy.
- [ ] **Decide how Spanish-speaking callers are served.** The attorney does
      not speak Spanish, so the Spanish pages never claim Spanish-language
      service: they ask visitors to mention a Spanish preference, and those
      leads arrive tagged `spanish`. Options: a Spanish-speaking staff member
      or interpreter for intake, or a referral. Whatever is chosen, tell me
      and I'll reflect it in `es.ts` (`landing.why.language`).
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
      `https://staging.mmg-lawfirm.com` (custom domain, cert, noindex),
      head parity identical to production on 17 pages (`pnpm parity`).
      Staging is its own cron-free Worker; the cutover is a written runbook
      (§D). All 19 Vercel production secrets were imported into both GitHub
      Cloudflare environments on 2026-10-25 (`DEPLOY.md` §6e). Staging lead
      test passed on 2026-10-25 after PR #187 (the first test showed
      Cloudflare cancelling post-response work: lead saved, nobody
      notified). Day-before prep done the same day: production Worker
      uploaded with crons off, 17-page parity with the live site, and
      production deploys now need AlwayzLegit's approval. **Cut over
      2026-10-25 ~21:15 UTC:** www and apex are served by the Worker and
      it runs the scheduled jobs (Vercel Cron off). Rollback stays
      possible until 2026-11-24 (plan §E); keep the Vercel project and its
      env vars until then. **Next (owner):** submit one real-browser test
      lead on www and mark it spam; confirm the notification reached
      Mihran (Resend dashboard); set up the Resend webhook; resubmit the
      sitemap in Search Console.
- [ ] Spec §18 open questions: real headshot, bar admission date and law
      school, Avvo / Justia / LinkedIn URLs for `sameAs`, firm founding year,
      existing case results to seed.
- [ ] Content agent: still publishes directly with the legacy shared
      `ADMIN_API_KEY` (owner has a separate plan; leave as is).

## Engineering backlog (not started)

- [x] Localize the lead form's field-level validation messages on `/hy`
      and `/ru` (dictionary `leadForm.fieldErrors`; English pages keep the
      schema's own wording). Included in the attorney review of the two
      dictionaries.
- [x] Analytics: median days from lead to signed per channel (PR #176).
- [ ] Cloudflare, after the 30-day hold (2026-11-24): remove `vercel.json`,
      drop the Vercel hosts from the CSP in `src/proxy.ts`, rewrite
      `DEPLOY.md` §6 for Workers, enable WAF / rate limiting at the edge,
      cancel Vercel Pro.
- [x] Doc drift: migration plan §D `CRON_SECRET` note (fixed in PR #177).

## Done in this sprint (for reference)

Hero DPR fix · auth streamlining (token-hash links, bootstrap-owner) ·
Cloudflare plan + spike + parity (Next 16.4.3, OpenNext, Images binding,
deploy workflow) · cron registry + `CRON_SECRET` · admin v3 restyle ·
speed-to-lead (Today queue, SLA stats, attribution, agenda email, 15-minute
breach alert, one-tap first response) · admin QA rounds 1–2 + audit RLS
fix · blog dedupe (53 copies) · intake deadlines + checklist · Armenian /
Russian / Spanish pages (review mode) · Cloudflare staging Worker on
staging.mmg-lawfirm.com · attorney review packet (shared doc). Migrations
applied through 0038.
