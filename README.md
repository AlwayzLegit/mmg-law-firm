# MMG Law Firm

Next.js rebuild of `mmg-lawfirm.com` — California personal-injury practice run by Mihran M. Ghazaryan (CA Bar #311455), based in Glendale. Single-domain, subfolder architecture optimized for statewide local SEO, with a custom admin for content + lead management.

The full build spec is in [`CLAUDE.md`](./CLAUDE.md). Read it before making changes — there are non-negotiable constraints (CRPC 7.1 compliance, no multi-domain network, no scaled city-page generation, no PHI on the public form).

**Going live?** See [`DEPLOY.md`](./DEPLOY.md) for the end-to-end deploy walkthrough.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript 5 (strict)
- Tailwind 4 + shadcn/ui (`base-nova` preset)
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr`
- React Hook Form + Zod
- Resend for transactional email; Twilio stubbed for SMS
- Cloudflare Turnstile for spam protection
- pnpm 9 / Node 20 LTS

## What's in the admin

Every editorial surface on the public site is editable from `/admin` without a deploy:

| Surface | Editor |
|---|---|
| Counties / cities / city × practice landing pages | `/admin/content/{counties,cities,location-pages}` |
| Practice areas (intro, body, subtopics, what-to-do, FAQs) | `/admin/content/practice-areas/[id]` |
| Attorney profile (bio, headshot, education, sameAs) | `/admin/content/attorneys/[id]` |
| Legal pages (privacy, disclaimer, CCPA, accessibility) | `/admin/content/legal/[id]` |
| Blog posts | `/admin/content/blog/[id]` |
| Testimonials | `/admin/content/testimonials/[id]` |
| Case results | `/admin/case-results/[id]` |
| Firm settings (founding year, sameAs URLs, homepage FAQs) | `/admin/settings/firm` |
| Leads pipeline | `/admin/leads` |
| Admin invites | `/admin/settings` |

All public pages have an **in-code fallback** so dev-without-Supabase still renders coherently and the public site never goes blank if a row is unpublished.

## Local development

1. `pnpm install`
2. `cp .env.local.example .env.local` and fill in real values (the file documents each var)
3. Apply migrations against your Supabase project — see [`DEPLOY.md`](./DEPLOY.md) §2b for the canonical order
4. Optional: generate types — `pnpm dlx supabase gen types typescript --project-id <id> > src/types/database.ts`
5. Insert your admin profile — see [`DEPLOY.md`](./DEPLOY.md) §3
6. `pnpm dev` (default port 3000; `--turbopack` is implicit)

You can also run the dev server **without Supabase configured** — every public page falls through to in-code seed content. Useful for design work without a DB round-trip. Admin routes redirect to `/login` in this mode.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unit tests) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm format` | Prettier write |

## Migrations

Live in `supabase/migrations/`. Apply in numbered order:

| File | Adds |
|---|---|
| `0001_init.sql` | Core tables + indexes + triggers |
| `0002_rls.sql` | Row-level security policies + `is_admin()` helper |
| `0003_seed_geo.sql` | California counties + Tier-1 cities |
| `0004_attorney_profiles.sql` | Attorney bio table + `attorney-headshots` storage bucket |
| `0005_practice_areas_editor.sql` | Adds editorial jsonb columns; seeds 9 practice areas |
| `0006_legal_pages.sql` | Legal pages table + seeds 4 canonical rows |
| `0007_firm_settings.sql` | Singleton settings row (founding year, sameAs URLs) |
| `0008_homepage_faqs.sql` | Adds homepage FAQs jsonb column |

## Deployment

- **Vercel Pro** required (Hobby ToS forbids commercial use).
- **Supabase Pro** for production: free tier pauses projects after 7 days of inactivity and has no point-in-time recovery — both unacceptable for a live legal site.

Step-by-step deploy walkthrough: [`DEPLOY.md`](./DEPLOY.md).

## Bar compliance reminders

Every public-facing page must include:
- Firm name and Glendale address (in the footer)
- "Attorney Advertising" disclaimer (footer + landing pages)
- General-purposes disclaimer (footer)
- Past-results disclaimer (in proximity to any case results)
- Testimonial disclaimer (in proximity to any client quotes)
- Bar number for the responsible attorney (footer)

Do not paraphrase the disclaimers — use the strings in `src/lib/constants.ts` (`DISCLAIMERS`) verbatim.

Legal pages (privacy / disclaimer / CCPA / accessibility) require attorney sign-off and a `last_reviewed_at` timestamp before they can be published, and the admin warns when any are overdue for the 12-month review (per spec §10.4).

## Schema markup

JSON-LD builders live in `src/lib/seo/schema.ts`. Sitewide LegalService + Person + WebSite graph emits via `<SchemaGraph />` in `src/app/layout.tsx`. Per-page schemas (Article, FAQPage, BreadcrumbList) emit from individual page components. Validate emitted markup using [Google Rich Results Test](https://search.google.com/test/rich-results) before each release.
