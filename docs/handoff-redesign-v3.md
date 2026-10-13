# Handoff — v3 redesign (branch `redesign-v3`)

_Written 2026-10-13 at the end of a local Claude Code session, for the cloud
session taking over. Read `CLAUDE.md` (project rules) first, then this._

## Where things stand

| | |
|---|---|
| Branch | `redesign-v3` (pushed; **not merged**, no PR opened) |
| Base | `main` @ `209e02f` |
| Commits | `971b16a` test/lint fixes · `7c8e9ce` redesign · `1977f8c` converter tool |
| Vercel preview | https://mmg-law-firm-2q3w2j5kd-alwayzlegits-projects.vercel.app (build ✅) |
| Checks (local) | `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm test` 134/134 ✅ · `pnpm build` ✅ (no warnings) |
| Route crawl | all 61 page routes 200 on `pnpm start`; only `/blog` 404s locally (no DB) |

Source of the design: Claude Design handoff "Redesign v3" (a 1.2 GB zip the
user keeps locally, **not** in the repo). The design's markup + logic is
committed at `tools/v3-design/design/redesign-v3.dc.html`; optimized images
are committed under `public/v3/`.

## Decisions the user made (don't relitigate)

1. **New brand site-wide on public pages** — charcoal `#12171b`, gold
   `#e8c384`, bronze `#8a5a1c`, ivory `#f8f4ed`; Georgia/Libre Baskerville +
   Lato. Overrides CLAUDE.md §11 for marketing pages. Admin keeps old look.
2. **Navigation** = design nav + SEO dropdowns: Our Attorney | Accident Cases ▾
   | About MMG ▾ | Resources ▾ | Locations ▾ | Contact | phone. All links are
   server-rendered `<a>`. Specialties **car, truck, motorcycle** lead the
   Accident Cases mega-menu.
3. **Homepage exactly as designed** (hero + 3 tiles). User accepted losing the
   old long-form homepage content.
4. **Build every page in the design** (50 pages), not just the hubs.
5. **Approved:** the AI portrait rendition of Mihran used in the design, and
   the claim "No recovery, no attorney fees or case expenses."
6. **All existing pages must stay.** Existing URLs were kept; new guides use
   the slugs proposed in the design's SEO notes.

## Architecture (what to read)

- `src/lib/v3/pages.ts` — **registry**: every v3 page's key, path, label,
  title, description, breadcrumb parent, group. Drives routes, metadata,
  breadcrumbs, sitemap, nav.
- `src/lib/v3/nav.ts` — header/footer link structure.
- `src/components/v3/`
  - `pages/*.tsx` — **generated** page bodies (one per design page). Safe to
    hand-edit, but re-running the converter overwrites them.
  - `v3-page-shell.tsx` — renders a page + JSON-LD (breadcrumb, FAQPage from
    `v3-faqs.ts`, LegalService for practice pages); `v3Metadata(key)`.
  - `v3-runtime.tsx` — one delegated listener for interactive regions
    (`data-v3-r` regions, `data-v3-on/off/tog` triggers, Escape, focus, scroll
    lock). All hidden content is server-rendered.
  - `v3-lead-form.tsx` — design-styled form on the **same** pipeline as the
    old LeadForm (Zod `LeadSchema`, TCPA consent unchecked, Turnstile,
    honeypot, `/api/leads`). Verified end-to-end locally (200 + success UI).
  - `v3-header.tsx` (+ `-client`), `v3-footer.tsx`, `v3-mobile-dock.tsx`,
    `v3-chrome.css`, `v3.css` (base + `.theme-v3` tokens), `v3-img.tsx`,
    `v3-assets.ts` (generated), `v3-city-links.tsx`, `v3-resource-tools.tsx`.
- Routes:
  - `app/(marketing)/[guide]/page.tsx` — 36 root-level guides (static).
  - `practice-areas/[slug]` — car, truck, motorcycle, rideshare, catastrophic
    injury, wrongful death render v3 (+ live city×practice links); other
    practice areas keep the old template (now re-themed via tokens).
  - attorney, contact, case-results, reviews, legal/privacy,
    legal/disclaimer → v3; `locations/los-angeles-county/glendale` → v3 Glendale
    office page (other cities unchanged).
- `tools/v3-design/` — the converter (see its README). Runs the prototype's
  logic class in Node and simulates every click handler to decide link vs
  anchor vs tel vs toggle region. `routes.mjs` mirrors `pages.ts` paths.

## Open items (prioritized)

1. **Attorney review of copy (blocking for launch).** All generated pages
   carry `TODO(human): attorney review required` — the handoff copy is AI
   drafted (statutes, deadlines, insurance rules). Also verify: attorney page
   says "Southwestern Law School"; reviews page quotes two Google/Birdeye
   excerpts (Steve Shag, David Dzharatanyan) — confirm they're real/approved.
2. **Admin-editable content is no longer shown** on v3 pages:
   - `/legal/privacy`, `/legal/disclaimer` now render the design's static text;
     the admin legal-page editor no longer affects them.
   - The six v3 practice areas no longer render `practice_areas.body_md` /
     FAQ JSON from the admin (live pages had ~1,300 words; design pages are a
     bit shorter). Decide with the user: append DB body below the design, or
     accept.
   - Attorney page ignores the DB bio (Person JSON-LD still uses DB fields).
   - `/case-results` and `/reviews` show the design's "no published outcomes"
     / excerpt content even if DB rows get published later — wire DB results
     in if the firm starts publishing them.
3. **Performance.** Generated pages use inline styles; a guide page's HTML is
   ~300 KB. Run Lighthouse mobile on the preview (targets: ≥90 perf, ≥95 a11y,
   ≥95 BP, 100 SEO). Likely wins: hoist repeated inline styles to classes in
   the converter, trim RSC payload. Hero images already prioritized/preloaded.
4. **Preview env**: `/blog` 404s on the preview (works on production) —
   probably Supabase env vars aren't set for Preview in Vercel. Check before
   judging DB-backed pages on the preview.
5. **Cleanup**: old marketing components (`site-header`, `site-footer`,
   `mobile-cta-bar`, `hero`, homepage sections…) are now unused by public
   routes — remove once the redesign is accepted.
6. Smaller notes:
   - `/how-an-accident-claim-works` and `/compensation-after-a-california-accident`
     keep one consult drawer with its own form (extra Turnstile widget).
   - Truck and motorcycle hubs have two inline forms each (as designed).
   - CA map on `/resources` is a pre-rendered static SVG (`public/v3/ca-map.svg`);
     the prototype's d3/CDN version is blocked by CSP. Hover-highlight dropped.
   - Design proposed `/uber-lyft-accident-lawyer` and
     `/catastrophic-injury-lawyer`; we kept the existing
     `/practice-areas/...` URLs instead (no duplicates, no redirects needed).
   - Mobile verified at 375px (home, menu, car); spot-check more at 768px.
   - Re-running `tools/v3-design/assets.mjs` needs the original zip images.

## How to verify

```bash
pnpm install
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm start -p 3300   # then crawl: every path in src/lib/v3/pages.ts → 200
```

Interactive checks worth repeating in a browser: Accident Cases mega-menu,
mobile menu, FAQ toggles (aria-expanded flips), a drawer (opens, Escape
closes, focus returns), `/contact` form validation + submit,
`/resources` fault slider + incident date.

## Rules that still apply (from CLAUDE.md)

Firm contact info only from `src/lib/constants.ts` (generated pages are
clean — keep it that way); the four disclaimers verbatim (footer); TCPA
checkbox unchecked by default; Turnstile only; no uploads on lead forms; no
invented results/testimonials/credentials; no merge to `main` or production
deploy without the user's explicit go-ahead.
